import {
  makeRemoteExecutableSchema,
  introspectSchema,
  mergeSchemas,
} from 'graphql-tools';
import fetch from 'node-fetch';
import * as ApolloLink from 'apollo-link';
import { setContext } from 'apollo-link-context';
import { HttpLink } from 'apollo-link-http';

export async function makeMergedSchema() {
  // const result = await fetch('https://v7l45qkw3.lp.gql.zone/graphql', {
  //   method: 'POST',
  //   headers: {
  //     accept: '*/*',
  //     'content-type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     query: '{ propertyById(id: "p1") { id }}'
  //   })
  // });
  // console.log(await result.text());
  // Create remote executable schemas
  // https://launchpad.graphql.com/v7l45qkw3
  const PropertyLink = new HttpLink({
    uri: 'https://v7l45qkw3.lp.gql.zone/graphql',
    fetch,
  });
  const PropertySchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(PropertyLink),
    link: PropertyLink,
  });

  // https://launchpad.graphql.com/41p4j4309
  const BookingLink = new HttpLink({
    uri: 'https://41p4j4309.lp.gql.zone/graphql',
    fetch,
  });
  const BookingSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(BookingLink),
    link: BookingLink,
  });

  const ContextLink = setContext((request, previousContext) => {
    console.log(previousContext.graphqlContext.authentication);
    return {
      ...previousContext,
      headers: {
        authentication: JSON.stringify(previousContext.graphqlContext.authentication),
      },
    };
  });
  const ProfileLink = new HttpLink({
    uri: 'http://localhost:4100/graphql',
    fetch,
  });
  const ProfileSchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(ProfileLink),
    link: ApolloLink.from([ContextLink, ProfileLink]),
  });

  // A small string schema extensions to add links between schemas
  const LinkSchema = `
    extend type Booking {
      property: Property
    }

    extend type Property {
      bookings(limit: Int): [Booking]
    }
  `;

  // merge actual schema
  const mergedSchema = mergeSchemas({
    // schemas: [PropertySchema, BookingSchema, LinkSchema],
    schemas: [PropertySchema, BookingSchema, LinkSchema, ProfileSchema],
    // Define resolvers manually for links
    resolvers: {
      Property: {
        bookings: {
          fragment: 'fragment PropertyFragment on Property { id }',
          resolve(parent, args, context, info) {
            return info.mergeInfo.delegateToSchema({
              schema: BookingSchema,
              operation: 'query',
              fieldName: 'bookingsByPropertyId',
              args: {
                propertyId: parent.id,
                limit: args.limit ? args.limit : null,
              },
              context,
              info,
            });
          },
        },
      },
      Booking: {
        property: {
          fragment: 'fragment BookingFragment on Booking { propertyId }',
          resolve(parent, args, context, info) {
            return info.mergeInfo.delegateToSchema({
              schema: PropertySchema,
              operation: 'query',
              fieldName: 'propertyById',
              args: {
                id: parent.propertyId,
              },
              context,
              info,
            });
          },
        },
      },
    },
  });

  return mergedSchema;
}
