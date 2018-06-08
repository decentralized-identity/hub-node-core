import CoreOptions from './interfaces/CoreOptions';
import Context from './Context';
import HubResponse from './models/HubResponse';
import RequestOptions from './interfaces/RequestOptions';

/**
 * Initializes the Hub Core. Must be invoked before handling Hub requests.
 * 
 * @param coreOptions Configuration options for initializing the Hub Core.
 */
function initialize(coreOptions: CoreOptions) {
  Context.store = coreOptions.store;
}

/**
 * Handles the incoming request.
 * 
 * @param request The raw request buffer.
 * @param requestOptions The optional request options.
 */
async function handleRequest(request: Buffer, requestOptions?: RequestOptions): Promise<HubResponse> {
  throw new Error('Not implemented.');
};

export { initialize, handleRequest };
