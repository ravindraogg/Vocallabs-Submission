# Users

## Creating Users

Users are created using the sign-up or sign-in flows described under [Supported Methods](/products/auth#supported-methods).

- **Avoid** creating users directly via GraphQL or the database, unless you are [importing users](#import-users) from an external system.
- **Avoid** modifying the database schema for the `auth.users` table.
- **Avoid** modifying the GraphQL root queries or fields for any of the tables in the `auth` schema.

You're allowed to:

- Add and remove your GraphQL relationships for the `users` table and other tables in the `auth` schema.
- Create, edit and delete permissions for the `users` table and other tables in the `auth` schema.

## Roles

Each user has one **default role** and a list of **allowed roles**. These roles are used to resolve permissions for requests to [GraphQL](/products/graphql/permissions) and [Storage](/products/storage/permissions).

When the user makes a request, only one role is used to resolve permissions. The default role is used if no role is explicitly specified. Users can only make requests using the default role or one of the allowed roles.

### Default Role

The default role is used when no role is specified in the request. By default, users' default role is `user`.

You can change what the default role for new users should be at **Settings -> Roles and Permissions**.

### Allowed Roles

Allowed roles are roles the user is allowed to use when making a request. Usually, you would change the role from `user` (the default role) to some other role because you want to use a different role to resolve permissions for a particular request.

By default, users have two allowed roles:

- `user` (default)
- `me`

You can change the default role for new users at **Settings -> Roles and Permissions**.

#### Assign Allowed Roles

It's possible to give users a subset of allowed roles during signup.

**Example:** Only set the `user` role (exclude the `me` role) for the user's allowed roles:

```js
await nhost.auth.signUp({
  email: 'joe@example.com',
  password: 'secret-password'
  options: {
    allowedRoles: ['user']
  }
})
```

### Set Role for GraphQL Requests

When no role is specified, the user's default role will be used:

```js
await nhost.graphql.request(QUERY, {})
```

If you want to make a GraphQL request using a specific role, you can do so by using the `x-hasura-role` header, like this:

```js
await nhost.graphql.request(
  QUERY,
  {},
  {
    headers: {
      'x-hasura-role': 'me'
    }
  }
)
```

If the request is not part of the user's allowed roles, the request will fail.

## Metadata

You can store custom information about the user in the `metadata` column of the `users` table. The `metadata` column is of type JSONB so any JSON data can be stored.

**Example:** Add metadata to a user during sign-up:

```js
await nhost.auth.signUp({
  email: 'joe@example.com',
  password: 'secret-password',
  options: {
    metadata: {
      birthYear: 1989,
      town: 'Stockholm',
      likes: ['Postgres', 'GraphQL', 'Hasura', 'Authentication', 'Storage', 'Serverless Functions']
    }
  }
})
```

## Get User Information using GraphQL

**Example:** Get all users.

```graphql
query {
  users {
    id
    displayName
    email
    metadata
  }
}
```

**Example:** Get a single user.

```graphql
query {
  user(id: "<user-id>") {
    id
    displayName
    email
    metadata
  }
}
```

## Import Users

If you have users in a different system, you can import them into Nhost. When importing users you should insert the users directly into the database instead of using the authentication endpoints (`/signup/email-password`) to avoid sending unnecessary transactional emails.

### GraphQL

Make a GraphQL request to insert a user like this:

```graphql
mutation insertUser($user: users_insert_input!) {
  insertUser(object: $user) {
    id
  }
}
```

### SQL

Connect directly to the database and insert a user like this:

```sql
INSERT INTO auth.users (id, email, display_name, password_hash, ..) VALUES ('<user-id>', '<email>', '<display-name>', '<password-hash>', ..);
```

Passwords are hashed using [bcrypt](https://en.wikipedia.org/wiki/Bcrypt).# Client & Redirect URLs

## Client URL

Client URL is the URL of your frontend application. The Client URL is used to redirect the user in certain auth workflows like signing in or resetting a password.

## Allowed Redirect URLs

Allowed Redirect URLs are the URLs of your frontend application that users are allowed to be redirected to on specific auth workflows. This is useful if you have multiple applications using the same Nhost backend or if you want to redirect users to a specific URL after certain authentication workflows.

As an example, for a staging project, you can set the Client URL to `https://staging.example.com` and Allowed Redirect URLs to `https://*.vercel.app`. This way, the user can be redirected to any Vercel deployment of your frontend application.# JSON Web Tokens (JWTs)

import { Tabs, TabItem } from '@astrojs/starlight/components';


## Introduction

JSON Web Tokens (JWT) are encoded strings designed to securely transmit information between parties in the form of a JSON object. Each JWT consists of three parts: 

- header
- payload
- signature

JWTs are commonly used for authentication post-login. The server generates a token containing user claims (like identity and permissions) that subsequent requests can include to prove authorization.

Here's how JWTs typically work in an authentication flow:

1. User logs in with credentials (username/password)
2. Server validates credentials and generates a signed JWT containing user information and permissions
3. Server sends the JWT to the client, which stores it (usually in browser storage)
4. For subsequent requests, the client includes the JWT in the Authorization header
5. Server verifies the token's signature and grants access based on the encoded permissions

The main advantage is that the server doesn't need to store session information - all necessary data is contained within the token itself, making it ideal for stateless authentication. 

:::note
For more information about JSON Web Tokens, visit [jwt.io](https://jwt.io).
:::

## JWT Configuration

You can configure your project to use three different kinds of JWTs:

- JWTs signed with symmetric keys
- JWTs signed with asymmetric keys
- JWTs signed externally via a third-party service

:::note
Currently we default to using symmetric keys for signing JWTs. However, we plan to change this to use asymmetric keys in the near future.
:::

### Symmetric Keys

With symmetric keys, your project uses a single key for both signing and verifying JWTs. This key is stored in the project's configuration and is responsible for signing JWTs. When a client sends a JWT to the server, the server uses the same key to verify the JWT’s signature. If you need to verify JWTs in a different service, the same key can be used for verification. Since the same key is used for both signing and verification, it is crucial to keep it secret, as sharing it with others can compromise the security of your JWTs.


Below you can see an example of a symmetric key configuration:


<Tabs>
  <TabItem label="nhost.toml">
```toml
[[hasura.jwtSecrets]]
type = 'HS256'
key = 'f03d5f5a0ed055e3fcbc0a3639405aca0511e6abe6d60e40d1fff610c6248f2a'
```
  </TabItem>
  <TabItem label="dashboard">
![Symmetric Key Configuration](/images/auth/jwt/symmetric.png)
  </TabItem>
</Tabs>

:::note
We recommend using a [secret](/platform/cloud/secrets) to configure the key.
:::

In addition to `HS256`, you can also use `HS384` and `HS512` for extra security. To quickly generate a key, you can use the following command:

<Tabs>
  <TabItem label="HS256">
    ```shell
    openssl rand -base64 32
    ```
  </TabItem>
  <TabItem label="HS384">
    ```shell
    openssl rand -base64 48
    ```
  </TabItem>
  <TabItem label="HS512">
    ```shell
    openssl rand -base64 64
    ```
  </TabItem>
</Tabs>

### Asymmetric Keys

With asymmetric keys, your project uses a pair of public and private keys for signing and verifying JWTs. The private key, stored securely in the project's configuration, is used to sign the JWTs. The public key, on the other hand, is made available to clients and is used to verify the JWTs. When a client sends a JWT to the server, the server uses the public key to validate the JWT’s signature. If verification is needed in a different service, the public key can be used without compromising security. Since the public key is only used for verification and the private key for signing, sharing the public key is safe and does not jeopardize the security of your JWTs.


Below you can see an example of an asymmetric key configuration:

<Tabs>
  <TabItem label="nhost.toml">
```toml
[[hasura.jwtSecrets]]
type = "RS256"
kid = "bskhwtelkajsd"
key = ""
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqSFS8Kx9LuiYpIms+NoZ
(ommited for brevity)
jwIDAQAB
-----END PUBLIC KEY-----
""
signingKey = ""
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpIVLwrH0u6Jik
(ommited for brevity)
s6fJmz3ZeArPI8KFSI3Q2xqm
-----END PRIVATE KEY-----
""
```
  </TabItem>
  <TabItem label="dashboard">
![Asymmetric Key Configuration](/images/auth/jwt/asymmetric.png)
  </TabItem>
</Tabs>

In addition to `RS256`, you can also use `RS384` and `RS512` for extra security. To quickly generate a key pair, you can use the following commands:

<Tabs>
  <TabItem label="RS256">
    ```shell
    # Generate a private key
    openssl genpkey -algorithm RSA -out jwt_private.pem -pkeyopt rsa_keygen_bits:2048

    # Generate a public key from the private key
    openssl rsa -pubout -in jwt_private.pem -out jwt_public.pem
    ```
  </TabItem>
  <TabItem label="RS384">
    ```shell
    # Generate a private key
    openssl genpkey -algorithm RSA -out jwt_private.pem -pkeyopt rsa_keygen_bits:3072

    # Generate a public key from the private key
    openssl rsa -pubout -in jwt_private.pem -out jwt_public.pem
    ```
  </TabItem>
  <TabItem label="RS512">
    ```shell
    # Generate a private key
    openssl genpkey -algorithm RSA -out jwt_private.pem -pkeyopt rsa_keygen_bits:4096

    # Generate a public key from the private key
    openssl rsa -pubout -in jwt_private.pem -out jwt_public.pem
    ```
  </TabItem>
</Tabs>

You can then copy the contents of `jwt_private.pem` into the `signingKey` field and the contents of `jwt_public.pem` into the `key` field.

The `kid` value in your configuration can be any unique string of your choice and must be distinct for each key. It is used to identify the correct key when verifying JWTs through the JWKS endpoint.

### External Signing

If you are using a third party service like Auth0 or Clerk you can configure your project to use their JWK endpoint to verify JWTs. Below you can see an example of an external signing configuration:

<Tabs>
  <TabItem label="nhost.toml">

```toml
[[hasura.jwtSecrets]]
jwk_url = "https://mythirdpartyservice.com/jwks.json"
```

Alternatively, you can configure the public key directly:

```toml
[[hasura.jwtSecrets]]
type = "RS256"
key = ""
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqSFS8Kx9LuiYpIms+NoZ
(ommited for brevity)
jwIDAQAB
-----END PUBLIC KEY-----
""
```
  </TabItem>
  <TabItem label="dashboard">
![External signing](/images/auth/jwt/external.png)
  </TabItem>
</Tabs>

:::note
When using external signing the Auth service will be automatically disabled.
:::

## Verify a JWT

To verify JWTs inside Nhost Functions (for both symmetric and asymmetric keys), see the [JWT Verification guide](/products/functions/guides/jwt-verification).

## Custom Claims

You can attach extra information to your JWTs in the form of custom claims. These claims can be used for authorization purposes in your application. For more details on how to add custom claims to your JWTs and how to use them, see the [Permissions Variables](/products/graphql/permissions/permission-variables) documentation.