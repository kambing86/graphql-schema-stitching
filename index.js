import express from 'express';
import bodyParser from 'body-parser';
import {
  graphqlExpress,
  graphiqlExpress,
} from 'apollo-server-express';

import { makeMergedSchema } from './schema';
import { getToken, decode } from './jwtHelper';

const PORT = 1337;

const app = express();

// bodyParser is needed just for POST.
(async () => {
  let schema;
  try {
    schema = await makeMergedSchema();
  } catch (e) {
    console.error(e);
  }
  // app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));
  app.use('/graphql', bodyParser.json(), graphqlExpress((req) => {
    const token = getToken(req);
    const authentication = decode(token);
    return {
      schema,
      context: {
        authentication,
      },
    };
  }));
  app.get('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
  })); // if you want GraphiQL enabled

  app.listen(PORT);

  console.log(`listening to port ${PORT}`);
})();
