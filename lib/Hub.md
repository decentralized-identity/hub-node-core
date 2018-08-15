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
> NOTE: The requester needs to be identified and authenticated in order for Hub to send the encrypted response. This will be discussed in the end-to-end authentication section of this document.

# End-To-End Authentication
The Hub requires end-to-end (two-way) authentication for all request-response exchanges using the JWS scheme. As a result of the additional message confidentiality requirement described earlier, all requests and responses are first JWS signed, then JWE encrypted.

The following sequence diagram shows the complete end-to-end authentication (and encryption) flow:

```sequence
Requester -> Requester:  Creates signed access request + nonce as a JWS.
Requester -> Requester:  Encrypts the JWS as a JWE using Hub's public-key.
Requester -> Hub:        JWE encrypted access request

Hub -> Hub:        Decrypts JWE blob.
Hub -> Hub:        Verifies requester-signed JWS.
Hub -> Hub:        Creates signed JWT.
Hub -> Hub:        Wraps signed JWT + requester-issued nonce as a JWS.
Hub -> Hub:        Encrypts JWS as a JWE using requester's public-key.
Hub --> Requester: JWE encrypted Hub-signed JWT

Requester -> Requester:  Decrypts JWE blob.
Requester -> Requester:  Verifies requester-issued nonce in JWS.
Requester -> Requester:  Verifies Hub-signed JWS.
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

1. The requester creates a self-signed access request as a JWS. A request to the Hub is considered an "access request" if the JWS header does not contain the ```did-access-token``` parameter. A nonce must be added to the ```did-requester-nonce``` JWS header parameter for every request sent to the Hub, the Hub must then include the same nonce header in the response to protect the requester from response replays. The requester nonce is included in the header rather than the payload to decouple authentication data from the request or response data. The Hub will ignore the actual payload in the JWS during this phase of the authentication flow.

1. Requester sends the JWS to the Hub.

1. The Hub verifies the JWS by resolving the requester's DID then obtaining the public key needed for verification. The requester's DID and the public-key ID can be derived from ```kid``` JWS header parameter. The same public-key must be used for encrypting the response.
> Public key resolution is pending real implementation.

4. The Hub generates a time-bound token for the requester to use in future communication. This token technically can be of any opaque format, however in the DID Hub Core Library implementation, the token is a signed JWT.

1. The Hub signs/wraps the token (in our case a signed JWT) as the payload of a JWS. The Hub must also copy the ```did-requester-nonce``` JWS header parameter from the request into the JWS header.

> Note: Currently the DID Hub Core library authentication implementation is stateless, thus it is subject to request replays within the time-bound window allowed by the JWT. However the requester nonce can be cached on the Hub in the future to prevent all request replays.

6. The Hub sends the JWS back to the requester.

1. The requester verifies the value in the ```did-requester-nonce``` JWT header parameter matches its requester-issued nonce.

1. The requester verifies that JWS is signed by the Hub by resolving the Hub's DID then obtaining the public key needed for verification. The Hub's DID and the public-key ID can be derived from ```kid``` header parameter.

1. The Hub is authenticated after the step above. The requester caches the Hub-issued token (signed JWT) locally and reuse it for all future requests to the Hub until the Hub rejects it, most commonly due to token expiry, at which point the requester would request a new access token.

1. The requester crafts the actual Hub request, and creates a new nonce.

1. The requester signs the Hub request as a JWS, including the new nonce in the ```did-requester-nonce``` header parameter and the Hub-signed JWT in the ```did-access-token``` header parameter.

1. The requester sends the signed Hub request to the Hub.

1. The Hub verifies the JWS by resolving the requester's DID then obtaining the public key needed for verification. The same public-key must be used for encrypting the response.

1. The Hub verifies the signed JWT given in the ```did-access-token``` header parameter.

1. The requester is authenticated after the step above. The Hub process the request and generates an in-memory response.

1. The Hub signs the Hub response as a JWS, including the ```did-requester-nonce``` header parameter from the request in the JWS header.

1. The Hub sends the signed Hub response back to the requester.

1. The requester verifies that the value in the ```did-requester-nonce``` JWS header parameter matches its requester-issued nonce.

1. The requester verifies that JWT is signed by the Hub by resolving Hub's DID and obtaining the public key specified by the ```kid``` header in the JWT.

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

## Example JWS header
```json
{
  "kid": "did:example:123456789abcdefghi#keys-1",
  "alg": "RS256",
  "did-requester-nonce": "p6OLLpeRafCWbOAEYpuGVTKNkcq8l",
  "did-access-token": "..."
}
```


# Signature and Encryption Algorithms
This section lists the signature and encryption algorithms currently supported (implemented and tested). In reality, the Hub Core implementation uses Cisco's JOSE library, which officially supports a few more algorithms such as ECDSA P256, but since we have not tested those curves end-to-end and those are considered insecure by some, they have not been added to the supported list.

## JWS Support
| Serialization         | Support |
| --------------------- | ------- |
| Compact Serialization | Yes     |
| JSON Serialization    | No      |

### Hub Response and Token Signing
| Algorithm          | Support           | JOSE specified | JWK specified | 
| ------------------ | ----------------- | -------------- | ------------- |
| RS256              | Yes               | Yes            | Yes           |
| ED25519            | To be implemented | To be added    | Yes           |
| SECP256K1          | To be implemented | To be added    | To be added   |

### Request Signature Verification
| Algorithm          | Support           | JOSE specified | JWK specified | 
| ------------------ | ----------------- | -------------- | ------------- |
| RS256              | Yes               | Yes            | Yes           |
| RS512              | Yes               | Yes            | Yes           |
| ED25519            | To be implemented | To be added    | Yes           |
| SECP256K1          | To be implemented | To be added    | To be added   |
> Note: ED25519 is defined in JWK specification, while SECP256K1 is not. Neither algorithms are listed in the JOSE signature and encryption algorithms, (https://www.iana.org/assignments/jose/jose.xhtml#web-signature-encryption-algorithms), and are not implemented in the node-jose NPM package used in the current implementation.


## JWE Support
| Serialization         | Support |
| --------------------- | ------- |
| Compact Serialization | Yes     |
| JSON Serialization    | No      |

> Discussion: Current implementation assumes Compact Serialization in the HTTP POST body and payload. We might want to support JSON serialization for POST body instead/in addition.

### Key Encryption
Asymmetric algorithms that can be used by the Hub to encrypt the symmetric content encryption key in the Hub response JWE:
| Algorithm                | Support           | JOSE specified | JWK specified |
| ------------------------ | ----------------- | -------------- | ------------- |
| RSA-OAEP                 | Yes               | Yes            | Yes           |
| ED25519                  | To be implemented | To be added    | Yes           |
| SECP256K1                | To be implemented | To be added    | To be added   |

### Key Decryption
Asymmetric algorithms that can be used by the Hub to decrypt the symmetric content encryption key in the Hub request JWE:
| Algorithm                | Support           | JOSE specified | JWK specified |
| ------------------------ | ----------------- | -------------- | ------------- |
| RSA-OAEP                 | Yes               | Yes            | Yes           |
| RSA-OAEP-256             | Yes               | Yes            | Yes           |
| ED25519                  | To be implemented | To be added    | Yes           |
| SECP256K1                | To be implemented | To be added    | To be added   |

### Content Encryption
Symmetric algorithms that can be used by the Hub to encrypt the content of the Hub response JWE:
| Algorithm                     | Support            | JOSE specified |
| ----------------------------- | ------------------ | -------------- |
| A128GCM                       | Yes                | Yes            |
| XSalsa20-Poly1305             | To be implemented  | To be added    |

### Content Decryption
Symmetric algorithms that can be used by the Hub to decrypt the content of the Hub request JWE:
| Algorithm                     | Support            | JOSE specified |
| ----------------------------- | ------------------ | -------------- |
| A128GCM                       | Yes                | Yes            |
| XSalsa20-Poly1305             | To be implemented  | To be added    |



# Cryptographic Algorithm Extensibility
This section describes how to add additional support to cryptographic algorithms in the Hub.

## JWE Content Encryption Key Encryption
Follow the steps below to add an additional algorithm for asymmetric key encryption:
1. Extend `getKeyEncryptionAlgorithm(...)` method in `HubEncryption.ts` to support a new JWK format.
1. Create a library function for the new encryption algorithm matching the `EncryptDelegate` definition found in `HubEncryption.ts`.
1. Reference the new encryption function in `encryptContentEncryptionKey(...)` method found in `HubEncryption.ts`.

## JWE Content Encryption Key Decryption
To be added.

## JWE Content Encryption
To be added.

## JWE Content Decryption
To be added.

## JWS Signing
To be added.

## JWS Signature Verification
Follow the steps below to add an additional algorithm for signature verification:
1. Create a library function for the new signing algorithm matching the `VerifySignatureDelegate` definition found in `HubAuthentication.ts`.
1. Reference the new signature verification function in the `verifySignature(...)` method found in `HubAuthentication.ts`.


# Future Work
- Stateful authentication scheme to prevent any replay attack.
- Stateful ephemeral key / forward secrecy support.
