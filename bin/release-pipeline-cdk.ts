#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { ReleasePipelineStack } from "../lib/release-pipeline-stack";

const app = new cdk.App();
new ReleasePipelineStack(app, "ReleasePipelineStack");
