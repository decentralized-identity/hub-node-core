import Base64Url from './Base64Url';

/**
 * Class for performing various JOSE operations.
 */
export default class Jose {
  /**
   * Gets the 'kid' value in the header of the given JWT/JWS.
   */
  public static getKeyIdInJweOrJws(jweOrJwsCompactString: string): string {
    const header = this.getJweOrJwsHeader(jweOrJwsCompactString);
    return header.kid;
  }

  /**
   * Gets the header of the given JWE/JWS as an object.
   */
  public static getJweOrJwsHeader(jweOrJwsCompactString: string): any {
    const headerLength = jweOrJwsCompactString.indexOf('.');
    const headerBase64Url = jweOrJwsCompactString.substr(0, headerLength);
    const jsonString = Base64Url.decode(headerBase64Url);

    return JSON.parse(jsonString);
  }

  /**
   * Gets the signed content (i.e. '<header>.<payload>') from the given compact serialized JWS.
   */
  public static getJwsSignedContent(jwsCompactString: string): string {
    const signedContentLength = jwsCompactString.lastIndexOf('.');
    const signedContent = jwsCompactString.substr(0, signedContentLength);

    return signedContent;
  }

  /**
   * Gets the base64 decrypted payload of the given compact serialized JWS.
   */
  public static getJwsPayload(jwsCompactString: string): any {
    const payloadStartIndex = jwsCompactString.indexOf('.') + 1;
    const payloadExclusiveEndIndex = jwsCompactString.lastIndexOf('.');
    const payload = jwsCompactString.substring(payloadStartIndex, payloadExclusiveEndIndex);

    return Base64Url.decode(payload);
  }

  /**
   * Gets the signature string in the given compact serialized JWS.
   */
  public static getJwsSignature(jwsCompactString: string): string {
    const signatureStartIndex = jwsCompactString.lastIndexOf('.') + 1;
    const signature = jwsCompactString.substr(signatureStartIndex);

    return signature;
  }
}
