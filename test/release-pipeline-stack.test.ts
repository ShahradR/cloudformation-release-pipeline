/* eslint-disable jest/expect-expect, jest/prefer-expect-assertions */

import {
  expect as expectCDK,
  haveResource,
  haveResourceLike,
  haveOutput,
  stringLike,
  arrayWith,
  objectLike,
} from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import { ReleasePipelineStack } from "../lib/release-pipeline-stack";

const app = new cdk.App();
const stack = new ReleasePipelineStack(app, "MyReleasePipelineStack");

describe("the CloudFormation stack", () => {
  it("has an AWS CodePipeline resource", () => {
    expectCDK(stack).to(haveResource("AWS::CodePipeline::Pipeline"));
  });

  it("has an AWS CodePipeline Webhook resource", () => {
    expectCDK(stack).to(haveResource("AWS::CodePipeline::Webhook"));
  });
});
describe("the CodePipeline pipeline", () => {
  it("triggers on GitHub deployments", () => {
    expectCDK(stack).to(
      haveResourceLike("AWS::CodePipeline::Webhook", {
        Filters: [{ JsonPath: "$.deployment.environment" }],
      })
    );
  });

  it("runs against the main branch", () => {
    expectCDK(stack).to(
      haveResourceLike("AWS::CodePipeline::Pipeline", {
        Stages: [
          {
            Name: "Source",
            Actions: [
              {
                Configuration: {
                  BranchName: "main",
                },
              },
            ],
          },
        ],
      })
    );
  });

  it("uses the CodeStar connector to authenticate against GitHub", () => {
    expectCDK(stack).to(haveResource("AWS::CodeStarConnections::Connection"));
  });

  it("does not use OAuth to authenticate against GitHub", () => {
    expectCDK(stack).notTo(
      haveResourceLike("AWS::CodePipeline::Pipeline", {
        Stages: [
          {
            Name: "Source",
            Actions: [
              {
                Category: "Source",
                Owner: "ThirdParty",
                Provider: "GitHub",
                Version: "1",
              },
            ],
          },
        ],
      })
    );
  });

  it.todo("does not pass the SecretToken as a plaintext value");

  it.todo(
    "does not pass the SecretToken value as a Ref to a parameter with a default value"
  );
});

describe("the CodePipeline webhook", () => {
  it("provides the webhook URL as an output", () => {
    expectCDK(stack).to(
      haveOutput({
        outputName: "WebhookUrl",
      })
    );
  });

  it("does not configure a webhook in the target GitHub repository", () => {
    expectCDK(stack).to(
      haveResourceLike("AWS::CodePipeline::Webhook", {
        RegisterWithThirdParty: false,
      })
    );
  });
});

describe("the CodePipeline artifact S3 bucket", () => {
  it.todo("has a bucket policy");

  it("has access logging enabled", () => {
    expectCDK(stack).to(
      haveResourceLike("AWS::S3::Bucket", {
        LoggingConfiguration: {
          DestinationBucketName: {
            "Fn::ImportValue": "S3ServerAccessLogTarget",
          },
          LogFilePrefix: stringLike(
            "MyReleasePipelineStackcodepipelineArtifactsBucket*"
          ),
        },
      })
    );
  });
});

describe("the CodePipeline IAM policy", () => {
  it("does not allow the * action", () => {
    expectCDK(stack).notTo(
      haveResourceLike("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: arrayWith(
            objectLike({
              Action: "*",
            })
          ),
        },
      })
    );
  });

  it.todo("does not allow a * resource with the PassRole action");

  it.todo("does not allow the * resource");
});
