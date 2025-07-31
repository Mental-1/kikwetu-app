import { gql } from "graphql-tag"

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type User {
    id: ID!
    email: String
    fullName: String
    username: String!
    bio: String
    avatarUrl: String
    location: String
    phone: String
    birthDate: DateTime
    nationality: String
    emailVerified: Boolean!
    phoneVerified: Boolean!
    listingCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Category {
    id: ID!
    name: String!
    icon: String
    createdAt: DateTime!
    subcategories: [Subcategory!]!
    listings: [Listing!]!
  }

  type Subcategory {
    id: ID!
    name: String!
    icon: String
    parentCategoryId: ID!
    category: Category!
    listings: [Listing!]!
  }

  type Listing {
    id: ID!
    title: String!
    description: String!
    price: Float
    location: String
    latitude: Float
    longitude: Float
    condition: String
    featured: Boolean!
    images: [String!]!
    views: Int!
    status: String!
    paymentStatus: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    expiryDate: DateTime
    category: Category
    subcategory: Subcategory
    seller: User!
    distance: Float
  }

  type SearchResult {
    listings: [Listing!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  input SearchInput {
    query: String
    categoryId: ID
    subcategoryId: ID
    location: String
    minPrice: Float
    maxPrice: Float
    condition: String
    userLat: Float
    userLng: Float
    radiusKm: Int
    sortBy: String
    page: Int
    limit: Int
  }

  input CreateListingInput {
    title: String!
    description: String!
    price: Float
    location: String!
    latitude: Float
    longitude: Float
    condition: String!
    categoryId: ID!
    subcategoryId: ID
    images: [String!]!
    shippingAvailable: Boolean
    shippingCost: Float
  }

  input UpdateProfileInput {
    fullName: String
    bio: String
    phone: String
    location: String
    birthDate: DateTime
    nationality: String
    avatarUrl: String
  }

  type Query {
    me: User
    listing(id: ID!): Listing
    listings(input: SearchInput): SearchResult!
    categories: [Category!]!
    category(id: ID!): Category
    subcategories(categoryId: ID!): [Subcategory!]!
    savedListings: [Listing!]!
    userListings(userId: ID!): [Listing!]!
  }

  type Mutation {
    createListing(input: CreateListingInput!): Listing!
    updateListing(id: ID!, input: CreateListingInput!): Listing!
    deleteListing(id: ID!): Boolean!
    updateProfile(input: UpdateProfileInput!): User!
    saveListing(listingId: ID!): Boolean!
    unsaveListing(listingId: ID!): Boolean!
    incrementViews(listingId: ID!): Boolean!
  }
`
