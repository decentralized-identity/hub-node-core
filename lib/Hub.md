**DID Hub Core Library Documentation**
============================================

# Overview
This document describes everything you need know about the DID Hub Core Library.

# End-To-End Authenticated Encryption
Authenticated encryption ensures the confidentiality and integrity of the messages being exchanged. The Hub requires and enforces end-to-end (two-way) authenticated encryption for all requests and responses using the JWE scheme.

> TODO: Test hooks will be provided to bypass message encryption and decryption for test and development purposes.

```sequence
Requester -> Requester: Creates the request.
Requester -> Requester: Encrypts the request as a JWE using Hub's public-key.
Requester -> Hub:       JWE encrypted request
Hub -> Hub:             Decrypts the JWE using its corresponding private-key.
Hub -> Hub:             Processes the request then generates the Hub Response.
Hub -> Hub:             Encrypts the response as a JWE using requester's public-key.
Hub --> Requester:      JWE encrypted response
Requester -> Requester: Decrypts the JWE using its corresponding private-key.
Requester -> Requester: Handles the response.

```

Specifically, every request sent to the Hub must be JWE encrypted using a public-key specified in the Hub's DID Document. The ID of the public-key must be specified in the ```kid``` JWE header parameter as a DID fragment (see https://w3c-ccg.github.io/did-spec/#fragments).

## Example JWE header:

```json
{
  "kid": "did:example:123456789abcdefghi#keys-1",
  "alg": "RSA-OAEP-256",
  "enc": "A128GCM",
}
```
> NOTE: The requester needs to be identified and authenticated in order for Hub to send the encrypted response. This will be discussed in the end-to-end authentication of this document.

# End-To-End Authentication
The Hub requires end-to-end (two-way) authentication for all request-response exchanges using the JWS scheme. As a result of the additional message confidentiality requirement described early, all requests and responses are first JWS signed, then JWE encrypted.

The following sequence diagram shows the complete end-to-end authentication (and encryption) flow:

```sequence
Requester -> Requester:  Creates signed access request + nonce as a JWS.
Requester -> Requester:  Encrypts the JWS as a JWE using Hub's public-key.
Requester -> Hub:        JWE encrypted access request

Hub -> Hub:        Decrypts JWE blob.
Hub -> Hub:        Verifies requester-signed JWS.
Hub -> Hub:        Creates signed JWT with requester-issued nonce.
Hub -> Hub:        Encrypts signed JWT as a JWE using requester's public-key.
Hub --> Requester: JWE encrypted Hub-signed JWT

Requester -> Requester:  Decrypts JWE blob.
Requester -> Requester:  Verifies requester-issued nonce.
Requester -> Requester:  Verifies Hub-signed JWT.
Note right of Requester: Note: Hub is authenticated at this point.
Requester -> Requester:  The requester caches the JWT for future communication.
Note right of Requester: Note: the cached JWT can be reused until expiry.
Requester -> Requester:  Creates Hub request and new nonce.
Requester -> Requester:  Signs Hub request + Hub-issued JWT + nonce as a JWS.
Requester -> Requester:  Encrypts JWS as a JWE using Hub's public-key.
Requester -> Hub:        JWE encrypted Hub request.

Hub -> Hub:        Decrypts JWE blob.
Hub -> Hub:        Verifies requester-signed JWS.
Hub -> Hub:        Verifies Hub-issued JWT.
Note right of Hub: Note: requester is authenticated at this point.
Hub -> Hub:        Processes the request.
Hub -> Hub:        Signs Hub response + requester-issued nonce as a JWS.
Hub -> Hub:        Encrypts JWS as a JWE using requester's public-key.
Hub --> Requester: JWE encrypted Hub response

Requester -> Requester: Decrypts JWE blob.
Requester -> Requester: Verifies requester-issued nonce.
Requester -> Requester: Verifies Hub-signed JWS.
Requester -> Requester: Parses Hub response.

```

>Since all messages exchanged are protected by JWE, JWE encryption and decryption steps are intentionally omitted to highlight the authentication steps in the description below.

1. The requester creates a self-signed access request as a JWS. A nonce must be added to the ```did-requester-nonce``` JWS header parameter for every request sent to the Hub, the Hub must then include the same nonce header in the response to protect requester from response replays. The requester nonce is included in the header rather than the payload to decouple authentication data from the request or response data. The Hub will ignore the actual payload in the JWS during this phase of the authentication flow.

1. Requester sends the JWS to the Hub.

1. The Hub verifies the JWS by resolving the requester's DID then obtaining the public key needed for verification. The requester's DID and the public-key ID and can be derived from ```kid``` JWS header parameter. The same public-key must be used for encrypting the response.
> Public key resolution is pending real implementation.

4. The Hub generates a time-bound token for the requester to use in future communication. This token technically can be of any opaque format, however in the DID Hub Core Library implementation, the token is a signed JWT. The Hub must also copy the ```did-requester-nonce``` JWS header parameter from the request into its own JWT header.

> Note: Currently the DID Hub Core library authentication implementation is stateless, thus it is subject to request replays within the time-bound window allowed by the JWT. However the requester nonce can be cached on the Hub in the future to prevent all request replays.

1. The Hub sends the signed JWT back to the requester.
> TO BE DISCUSSED: decided if the signed JWT should be the payload of a JWS for consistency.

6. The requester verifies the value in the ```did-requester-nonce``` JWT header parameter matches its requester-issued nonce.

1. The requester verifies JWT is signed by the Hub by resolving the Hub's DID then obtaining the public key needed for verification. The Hub's DID and the public-key ID and can be derived from ```kid``` header parameter.

1. The Hub is authenticated after the step above. The Requester can caches the Hub-signed JWT locally and reuse it for all future requests to the Hub until the Hub rejects it, most commonly due to token expiry.

1. The requester crafts the actual Hub request, and creates a new nonce.

1. The requester signs the Hub request as a JWS, including the new nonce in the ```did-requester-nonce``` header parameter and the Hub-signed JWT in the ```did-service-token``` header parameter.

1. The requester sends the signed Hub request to the Hub.

1. The Hub verifies the JWS by resolving the requester's DID then obtaining the public key needed for verification. The same public-key must be used for encrypting the response.

1. The Hub verifies the signed JWT given in the ```did-service-token``` header parameter.

1. The requester is authenticated after the step above. The Hub process the request and generates an in-memory response.

1. The Hub signs the Hub response as a JWS, including the ```did-requester-nonce``` header parameter from the request in the JWS header.

1. The Hub sends the signed Hub response back to the requester.

1. The requester verifies the value in the ```did-requester-nonce``` JWS header parameter matches its requester-issued nonce.

1. The requester verifies JWT is signed by the Hub by resolving Hub's DID and obtaining the public key specified by the ```kid``` header in the JWT.

## Example Hub JWT Payload
```json
{
  "jti": "3e2c9b3a-da11-47e2-a5d8-12a23a9d41e4",
  "iss": "did:example:hub-did",
  "sub": "did:example:requester-did",
  "iat": 1533168455,
  "exp": 1533172655
}
```

> TO BE DISCUSSED: Should we go did- prefix all the way or really reuse JWT abbreviations?

## Example JWS header
```json
{
  "kid": "did:example:123456789abcdefghi#keys-1",
  "alg": "RS256",
  "did-requester-nonce": "p6OLLpeRafCWbOAEYpuGVTKNkcq8l",
  "did-service-token": "..."
}
```


# JWS/JWT Support
## Serialization
|                       |     |
| --------------------- | --- |
| Compact Serialization | Yes |
| JSON Serialization    | No  |

## Signing Algorithms
|                    |     |
| ------------------ | --- |
| RS256              | Yes |
| RS512              | Yes |


# JWE Support
## Serialization
|                       |     |
| --------------------- | --- |
| Compact Serialization | Yes |
| JSON Serialization    | No  |

## Key Encryption Algorithms
|                    |     |
| ------------------ | --- |
| RSA-OAEP           | Yes |
| RSA-OAEP-256       | Yes |

## Content Encryption Algorithms
|                    |     |
| ------------------ | --- |
| A128GCM            | Yes |
| A256GCM            | Yes |

# Future Work
- Stateful authentication scheme to prevent any replay attack.
- Stateful ephemeral key and repudiation support.
