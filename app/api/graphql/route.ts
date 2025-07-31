import { startServerAndCreateNextHandler } from "@as-integrations/next"
import { ApolloServer } from "@apollo/server"
import { typeDefs } from "@/lib/graphql/schema"
import { resolvers } from "@/lib/graphql/resolvers"

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

const handler = startServerAndCreateNextHandler(server)

export { handler as GET, handler as POST }
