import { DidResolver, ResolveResult, DidDocument } from '@decentralized-identity/did-common-typescript';
import nodeFetch from 'node-fetch';

/**
 * Fetches DID Documents from remote resolvers over http
 * @class
 * @extends DidResolver
 */
export default class HttpResolver implements DidResolver {

  /**
   * @param universalResolverUrl the URL endpoint of the remote universal resolvers
   */
  constructor(private universalResolverUrl: string) {}

  /**
   * Looks up a DID Document
   * @inheritdoc
   */
  public async resolve(did: string): Promise<ResolveResult> {
    const slash = this.universalResolverUrl.endsWith('/') ? '' : '/';
    const query = `${this.universalResolverUrl}${slash}1.0/identifiers/${did}`;
    const response = await nodeFetch(query);
    // check the response
    if (!response.ok) {
      // an error has occurred
      console.log(`Universal Resolver has returned ${response.status}`);
      switch (response.status) {
        case 404:
          throw new Error(`Decentralized ID Document not found for ${did}`);
        default:
          throw new Error(`Universal Resolver threw error: ${response.statusText}`);
      }
    }

    const didDocument = await response.json();
    return {
      didDocument: new DidDocument(didDocument.document),
      metadata: didDocument.resolverMetadata,
    } as ResolveResult;
  }
}
