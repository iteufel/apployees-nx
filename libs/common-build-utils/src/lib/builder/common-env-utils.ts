/*******************************************************************************
 * © Apployees Inc., 2019
 * All Rights Reserved.
 ******************************************************************************/
import { IBuildBuilderOptions } from "../types/common-types";
import { BuilderContext } from "@angular-devkit/architect";
import { resolve } from "path";
import { existsSync } from "fs";
import { getProjectRoots } from "@nrwl/workspace/src/command-line/shared";
import _ from "lodash";

export function loadEnvironmentVariables(options: IBuildBuilderOptions, context: BuilderContext): object {
  const nodeEnv: string = options.dev ? "development" : "production";

  const baseEnvFileAtRootOfProject = resolve(options.envFolderPath || "", ".env");

  const dotEnvFiles = [
    options.additionalEnvFile,
    `${baseEnvFileAtRootOfProject}.local.${nodeEnv}`,
    `${baseEnvFileAtRootOfProject}.${nodeEnv}`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    nodeEnv !== "test" && `${baseEnvFileAtRootOfProject}.local.any`,
    `${baseEnvFileAtRootOfProject}.any`,
  ].filter(Boolean);

  const retVal: object = {
    NODE_ENV: nodeEnv,
  };

  // Load environment variables from .env* files. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.  Variable expansion is supported in .env files.
  // https://github.com/motdotla/dotenv
  // https://github.com/motdotla/dotenv-expand
  dotEnvFiles.forEach(dotenvFile => {
    if (existsSync(dotenvFile)) {
      const parsed = require("dotenv-expand")(
        require("dotenv").config({
          path: dotenvFile,
        }),
      ).parsed;

      for (const k in parsed) {
        if (_.isNil(retVal[k])) {
          retVal[k] = parsed[k];
        }
      }
    }
  });

  return retVal;
}

export interface IProcessedEnvironmentVariables {
  raw: object;
  stringified: object;
  nonStringified?: object;
}

export function getProcessedEnvironmentVariables(raw, topKey = "process.env"): IProcessedEnvironmentVariables {
  // Stringify all values so we can feed into Webpack DefinePlugin
  const stringified = {
    [topKey]: Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
  };

  return { raw, stringified, nonStringified: { [topKey]: raw } };
}

export function getDefaultEnvsFolderForProject(root, context: BuilderContext) {
  return resolve(
    root,
    context.target.project ? getProjectRoots([context.target.project])[0] : context.workspaceRoot,
    "envs",
  );
}
