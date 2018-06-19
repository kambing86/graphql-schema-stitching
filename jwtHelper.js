import jsonwebtoken from 'jsonwebtoken';

export function getToken(req) {
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

export function decode(token) {
  return jsonwebtoken.decode(token);
}
