import { GraphQLClient } from "graphql-request"

export const graphqlClient = new GraphQLClient(
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "https://api.routeme.com/graphql",
)

export const gql = String.raw
