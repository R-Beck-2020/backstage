/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import React from 'react';

import { GraphQlPullRequests, PullRequestsNumber } from '../utils/types';
import { useOctokitGraphQl } from './useOctokitGraphQl';

export const useGetPullRequestsFromRepository = () => {
  const graphql =
    useOctokitGraphQl<GraphQlPullRequests<PullRequestsNumber[]>>();

  const fn = React.useRef(
    async (
      repo: string,
      defaultLimit?: number,
    ): Promise<PullRequestsNumber[]> => {
      const [organisation, repositoryName] = repo.split('/');

      if (defaultLimit) {
        return getLimitedPullRequestEdges(
          graphql,
          repositoryName,
          organisation,
          defaultLimit,
        );
      }

      return await getAllPullRequestEdges(
        graphql,
        repositoryName,
        organisation,
      );
    },
  );

  return fn.current;
};

async function getLimitedPullRequestEdges(
  graphql: (
    path: string,
    options?: any,
  ) => Promise<GraphQlPullRequests<PullRequestsNumber[]>>,
  repositoryName: string,
  organisation: string,
  defaultLimit: number,
): Promise<PullRequestsNumber[]> {
  const result = await graphql(
    `
      query ($name: String!, $owner: String!, $defaultLimit: Int) {
        repository(name: $name, owner: $owner) {
          pullRequests(states: OPEN, first: $defaultLimit) {
            edges {
              node {
                number
              }
            }
          }
        }
      }
    `,
    {
      name: repositoryName,
      owner: organisation,
      defaultLimit: defaultLimit,
    },
  );

  return result.repository.pullRequests.edges;
}

async function getAllPullRequestEdges(
  graphql: (
    path: string,
    options?: any,
  ) => Promise<GraphQlPullRequests<PullRequestsNumber[]>>,
  repositoryName: string,
  organisation: string,
): Promise<PullRequestsNumber[]> {
  const pullRequestEdges: PullRequestsNumber[] = [];
  let result: GraphQlPullRequests<PullRequestsNumber[]> | undefined = undefined;

  do {
    result = await graphql(
      `
        query ($name: String!, $owner: String!, $endCursor: String) {
          repository(name: $name, owner: $owner) {
            pullRequests(states: OPEN, first: 100, after: $endCursor) {
              edges {
                node {
                  number
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
      {
        name: repositoryName,
        owner: organisation,
        endCursor: result
          ? result.repository.pullRequests.pageInfo.endCursor
          : undefined,
      },
    );

    pullRequestEdges.push(...result.repository.pullRequests.edges);
  } while (result.repository.pullRequests.pageInfo.hasNextPage);

  return pullRequestEdges;
}
