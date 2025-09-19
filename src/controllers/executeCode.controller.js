import { db } from "../libs/db.js";
import {
  getLanguageName,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";
import { Status } from "../../generated/prisma/index.js";

// run and submit in one only later separate them
// run with 2 test cases and when user gets confience he can then click on submit 
// run with all test case on clicking submit including onces given by user
// user can add test cases
// hidden test cases, Making sure user can't see them, but can see results.
// User can see only 3 test cases + the test cases users have added

export const executeCode = async (req, res) => {
  try {
    // console.log("req.body", req.body);

    const { source_code, language_id, stdin, expected_outputs, problemId } =
      req.body;
    const userId = req.user.id;

    // 1. Validate test cases
    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_outputs) ||
      expected_outputs.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid or Missing test cases" });
    }

    // 2. Prepare each test case for judge0 batch submission
    const submissions = stdin.map((input) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    // 3. Send batch of submissions to judge0
    const submitResponse = await submitBatch(submissions);
    const tokens = submitResponse.map((res) => res.token);

    // 4. Poll judge0 for results of all submitted test cases
    const results = await pollBatchResults(tokens);

    // console.log("Results-------------", results);

    // 5. Analyze test case results
    let allPassed = true;

    const detailedResults = results.map((result, index) => {
      const stdout = result.stdout?.trim() ?? "";
      const expected_output = expected_outputs[index]?.trim() ?? "";
      const passed = stdout === expected_output;

      // console.log (`Testcase ${index + 1} \n ${passed ? "passed" : "failed"} \n`);
      // console.log(`Input ${stdin[index]}`);
      // console.log("stdout", stdout);
      // console.log("expected_output", expected_output);
      // console.log("\n");

      if (!passed) {
        allPassed = false;
      }

      return {
        testCase: index + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: result.stderr ?? null,
        compileOutput: result.compile_output ?? null,
        status: result.status.description,
        memory: result.memory ? `${result.memory} KB` : undefined, // storing memory in string and unit is kilobytes
        time: result.time ? `${result.time} s` : undefined, // storing time in string and unit is seconds
      };
    });

    // console.log("detailedResults", detailedResults);

    // 6. Store submission summary
    const submission = await db.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
        stderr: detailedResults.some((r) => r.stderr)
          ? JSON.stringify(detailedResults.map((r) => r.stderr))
          : null,
        compileOutput: detailedResults.some((r) => r.compile_output)
          ? JSON.stringify(detailedResults.map((r) => r.compile_output))
          : null,
        status: allPassed ? Status.ACCEPTED : Status.WRONG_ANSWER,
        memory: detailedResults.some((r) => r.memory)
          ? JSON.stringify(detailedResults.map((r) => r.memory))
          : null,
        time: detailedResults.some((r) => r.time)
          ? JSON.stringify(detailedResults.map((r) => r.time))
          : null,
      },
    });

    // 7. If all passed = true, mark problem as solved for the current user
    if (allPassed) {
      await db.problemSolved.upsert({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
        update: {},
        create: {
          userId,
          problemId,
        },
      });
    }

    // 8. Save individual test case results  using detailedResult
    const testCaseResults = detailedResults.map((result) => ({
      submissionId: submission.id,
      testCase: result.testCase,
      passed: result.passed,
      stdout: result.stdout,
      expected: result.expected,
      stderr: result.stderr,
      compileOutput: result.compileOutput,
      status:
        result.status === "Accepted"
          ? Status.ACCEPTED
          : Status.WRONG_ANSWER,
      memory: result.memory,
      time: result.time,
    }));

    console.log("testCaseResults", testCaseResults);

    await db.testCaseResult.createMany({
      data: testCaseResults,
    });

    // 9. Submission with test cases
     const submissionWithTestCase = await db.submission.findUnique({
      where: {
        id: submission.id,
      },
      include: {
        testCases: true,
      },
    });

    // 10. Send final response
    return res.status(200).json({
      success: true,
      message: "Code Executed Successfully",
      submission: submissionWithTestCase,
    });
  } catch (error) {
    console.error("Execution Error:", error);
    return res.status(500).json({
      error: "Error While Executing Code",
    });
  }
};
