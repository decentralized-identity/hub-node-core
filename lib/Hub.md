**Identity Hub Core Library Documentation**
============================================

# Overview
This document describes everything you need know about the Identity Core Library.

# Authentication
This section describes the supported authentication schemes.

## HTTP Signatures
To be implemnted

## Authenticated Encryption
Authenticated encryption ensures the confidentiality (a.k.a. secrecy) and integrity of the messages being exchanged. By combining authenticated encryption with digital signature verification, a scheme and be devised to authenticate a requester accessing the Hub and protect the messages being exchanged at the same time. The following sequence diagram shows the scheme supported and implemented by the Hub Core library to authenticate the requester at a high-level:

```sequence
Requester -> Hub:       JWE encrypted access request
Hub -> Hub:             Creates a signed JWT with expiry for Requester.
Hub --> Requester:      JWE encrypted signed JWT
Requester -> Requester: Caches Hub-signed JWT until expiry.
Requester -> Hub:       JWE encrypted Hub request with Hub-signed JWT
Hub -> Hub:             Validates and processes Hub request.
Hub --> Requester:      JWE encrypted Hub response
```

> DID signature validations are intentionally omitted in the diagrame above, see later sections for detailed authentication scheme description.

1. The requester initiates the access request to the Hub.
1. The Hub creates a time-bound signed JWT for requester for future communication.
1. The hub responds to the requester with the signed JWT.
1. The requester caches the Hub-signed JWT for future communication.
1. The requester sends the Hub request together with Hub-issued JWT to the Hub.
1. The Hub validates the JWT.
1. The Hub sends response back to the requester.

> All messages sent between the requester and the Hub are protected by authenticated encryption using JWE.

### Full Specification

```sequence
Requester -> Requester:  Creates signed access request + nonce using JWS.
Note right of Requester: Note: Nonce added to prevent replay from Hub.
Requester -> Requester:  Encrypts the JWS using JWE and Hub's public-key.
Requester -> Hub:        JWE encrypted access request

Hub -> Hub:        Decrypts JWE blob.
Hub -> Hub:        Verifies Requester-signed JWS.
Hub -> Hub:        Creates signed JWT with expiry + Requester-issued nonce.
Hub -> Hub:        Encrypts signed JWT using JWE and Requester's public-key.
Hub --> Requester: JWE encrypted Hub-signed JWT

Requester -> Requester:  Decryptes JWE blob.
Requester -> Requester:  Verifies Requester-issued nonce.
Requester -> Requester:  Verifies Hub-signed JWT.
Note right of Requester: Note: Hub is authenticated at this point.
Requester -> Requester:  The requester caches the JWT for future communication.
Note right of Requester: Note: the cached JWT can be reused until expiry.
Requester -> Requester:  Creates Hub request and new nonce.
Requester -> Requester:  Signs Hub request + Hub-issued JWT + nonce using JWS.
Requester -> Requester:  Encrypts JWS using JWE and Hub's public-key.
Requester -> Hub:        JWE encrypted Hub request.

Hub -> Hub:        Decrypts JWE blob.
Hub -> Hub:        Verifies requester-signed JWS.
Hub -> Hub:        Verifies Hub-issued JWT.
Note right of Hub: Note: Requester is authenticated at this point.
Hub -> Hub:        Processes the request.
Hub -> Hub:        Signs Hub response + Requester-issued nonce as a JWS.
Hub -> Hub:        Encrypts JWS using JWE and Requester's public-key.
Hub --> Requester: JWE encrypted Hub response

Requester -> Requester: Decrypts JWE blob.
Requester -> Requester: Verifies Requester-issued nonce.
Requester -> Requester: Verifies Hub-signed JWS.
Requester -> Requester: Parses Hub response.

```
Since all messages exchanged between the requester and the Hub are encrypted using JWE, JWE encrption and decryption will be omitted in the descriptions below.
>Henry's note: I now think that encryption (JWE) should be described in a completely separate section, away from the authentication flows. So as the implementation, JWE probably should be implemented as a middleware in a request handling pipeline.

1. The requester creates a self-signed initial access request. JWS is used as the signing scheme. A nonce should always be added to the JWS header ```did-requester-nonce``` everytime a request is sent to the Hub to prevent replay attack from responses. The Hub will ignore the actual payload in the JWS during this phase of the authentication flow.

1. Requester sends the JWS to the Hub.

1. The Hub verifies the JWS by resolving the requester's DID and obtaining the public key specified by the ```kid``` header in the JWS.
> Public key resolution is pending real implementation.

4. The Hub generates a time-bound token for the requester to use in future communication. This token technically can be of any opague format, however in the Hub Core Library implementation, the token is a signed JWT. The Hub copies the ```did-requester-nonce``` header parameter from the request into its own JWT header.

1. The Hub sends the signed JWT back to the requester.
> Henry's note: we should discuss if the signed JWT should be the payload of a JWS for consistency.

6. The requester verifies the value in the ```did-requester-nonce``` JWT header parameter matches its requester-issued nonce.
1. The requester verifies JWT is signed by the Hub by resolving Hub's DID and obtaining the public key specified by the ```kid``` header in the JWT.

1. The Hub is authenticated after the step above. The Requester can caches the Hub-signed JWT locally and reuse it for all future requests to the Hub until the Hub rejects it, most commonly due to token expiry.

1. The requester crafts the acutal Hub request, and creates a new nonce.

1. The requester signs the Hub request as a JWS, including the new nonce in the ```did-requester-nonce``` header parameter and the Hub-signed JWT in the ```did-service-token``` header parameter.

1. The requester sends the signed Hub request to the Hub.

1. The Hub verifies the JWS.

1. The Hub verifies the signed JWT given in the ```did-service-token``` header parameter.

1. The requester is authenticated after the step above. The Hub process the request and generates an in-memory response.

1. The Hub signs the Hub response as a JWS, including the ```did-requester-nonce``` header parameter from the request in the JWS header.

1. The Hub sends the signed Hub response back to the requester.

1. The requester verifies the value in the ```did-requester-nonce``` JWS header parameter matches its requester-issued nonce.

1. The requester verifies JWT is signed by the Hub by resolving Hub's DID and obtaining the public key specified by the ```kid``` header in the JWT.


### JWS/JWT Support
#### Serialization
|                       |     |
| --------------------- | --- |
| Compact Serialization | Yes |
| JSON Sereialization   | No  |

#### Signing Algorithms
|                    |     |
| ------------------ | --- |
| RS256              | Yes |
| RS512              | Yes |


### JWE Support
#### Serialization
|                       |     |
| --------------------- | --- |
| Compact Serialization | Yes |
| JSON Sereialization   | No  |

#### Key Encryption Algorithms
|                    |     |
| ------------------ | --- |
| RSA-OAEP           | Yes |
| RSA-OAEP-256       | Yes |

#### Content Encryption Algorithms
|                    |     |
| ------------------ | --- |
| A128GCM            | Yes |
| A256GCM            | Yes |

### Future Work
- Stateful token validation scheme.
- Stateful ephemeral key and repudiation.
