/* eslint-disable no-new */

import * as cdk from "@aws-cdk/core";
import {
  BitBucketSourceAction,
  CloudFormationCreateUpdateStackAction,
} from "@aws-cdk/aws-codepipeline-actions";
import {
  Pipeline,
  CfnWebhook,
  Artifact,
  ArtifactPath,
  CfnPipeline,
} from "@aws-cdk/aws-codepipeline";
import { CfnConnection } from "@aws-cdk/aws-codestarconnections";
import { CfnOutput, Token } from "@aws-cdk/core";

export class ReleasePipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const codeStarConnection = new CfnConnection(this, "codeStarConnection", {
      connectionName: "ShahradRGitHubConnection",
      providerType: "GitHub",
    });

    const sourceOutput = new Artifact();

    /**
     * The BitBucketSourceAction can also be used to connect to GitHub using the
     * v2 template. See https://github.com/aws/aws-cdk/issues/10632
     */
    const sourceAction = new BitBucketSourceAction({
      actionName: "SourceAction",
      owner: "ShahradR",
      repo: "sc-s3-portfolio",
      branch: "main",
      output: sourceOutput,
      connectionArn: codeStarConnection.attrConnectionArn,
    });

    const releaseAction = new CloudFormationCreateUpdateStackAction({
      actionName: "ReleaseAction",
      extraInputs: [sourceOutput],
      adminPermissions: true,
      stackName: "sc-s3-portfolio",
      templatePath: new ArtifactPath(
        sourceOutput,
        "templates/s3-portfolio.yaml"
      ),
      parameterOverrides: {
        PortfolioName: "S3 Portfolio",
        TemplateUrlPrefix:
          "https://brokentech-cfn.s3.ca-central-1.amazonaws.com/sc-s3-product/",
      },
    });

    const pipeline = new Pipeline(this, "codepipeline", {
      pipelineName: "codepipeline",
      crossAccountKeys: false,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Release",
          actions: [releaseAction],
        },
      ],
    });

    const webhook = new CfnWebhook(this, "GitHubWebhook", {
      authentication: "GITHUB_HMAC",
      authenticationConfiguration: { secretToken: "test1234" },
      targetPipeline: Token.asString(pipeline.pipelineName),
      targetAction: sourceAction.actionProperties.actionName,
      targetPipelineVersion: Token.asNumber(pipeline.pipelineVersion),
      registerWithThirdParty: false,
      filters: [
        {
          jsonPath: "$.deployment.environment",
          matchEquals: "taskcat",
        },
      ],
    });

    webhook.addDependsOn(pipeline.node.defaultChild as CfnPipeline);

    new CfnOutput(this, "WebhookUrl", {
      value: webhook.attrUrl,
    });
  }
}
