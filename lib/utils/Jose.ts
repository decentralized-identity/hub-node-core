import Base64 from './Base64';

/**
 * Class for performing various JOSE operations.
 */
export default class Jose {
  /**
   * Gets the 'kid' value in the header of the given JWT/JWS.
   */
  public static getKeyIdInJweOrJws(jweOrJwsCompactString: string) {
    const header = this.getJweOrJwsHeader(jweOrJwsCompactString);
    return header.kid;
  }

  /**
   * Gets the header of the given JWE/JWS as an object.
   */
  public static getJweOrJwsHeader(jweOrJwsCompactString: string): any {
    const headerLength = jweOrJwsCompactString.indexOf('.');
    const headerBase64 = jweOrJwsCompactString.substr(0, headerLength);

    return Base64.toObject(headerBase64);
  }
}
