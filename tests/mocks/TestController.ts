import BaseController from '../../lib/controllers/BaseController';
import HubRequest from '../../lib/models/HubRequest';
import HubResponse from '../../lib/models/HubResponse';
import TestContext from './TestContext';

/**
 * TestController implements an Interface controller (Action, Collection, Profile, etc.) with dynamic
 * calling, such that behavior can be changed on the fly between or during tests. By default,
 * TestController will throw for any request not set beforehand.
 */
export default class TestController extends BaseController {
  private onCreate?: (request: HubRequest) => Promise<HubResponse>;
  private onRead?: (request: HubRequest) => Promise<HubResponse>;
  private onDelete?: (request: HubRequest) => Promise<HubResponse>;
  private onUpdate?: (request: HubRequest) => Promise<HubResponse>;
  private onExecute?: (request: HubRequest) => Promise<HubResponse>;

  constructor() {
    super(TestContext.instance);
  }

  async handleCreateRequest(request: HubRequest): Promise<HubResponse> {
    if (!this.onCreate) {
      throw new Error('Add not defined in TestController.');
    } else {
      return this.onCreate(request);
    }
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    if (!this.onRead) {
      throw new Error('Read not defined in TestController.');
    } else {
      return this.onRead(request);
    }
  }

  async handleDeleteRequest(request: HubRequest): Promise<HubResponse> {
    if (!this.onDelete) {
      throw new Error('Remove not defined in TestController.');
    } else {
      return this.onDelete(request);
    }
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    if (!this.onUpdate) {
      throw new Error('Update not defined in TestController.');
    } else {
      return this.onUpdate(request);
    }
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    if (!this.onExecute) {
      throw new Error('Execute not defined in TestController.');
    } else {
      return this.onExecute(request);
    }
  }

  removeAllHandlers() {
    this.onCreate = undefined;
    this.onRead = undefined;
    this.onDelete = undefined;
    this.onUpdate = undefined;
    this.onExecute = undefined;
  }

  setHandler(action: string, handler: (request: HubRequest) => Promise<HubResponse>) {
    switch (action.toLowerCase().trim()) {
      case 'create':
        this.onCreate = handler;
        break;
      case 'read':
        this.onRead = handler;
        break;
      case 'update':
        this.onUpdate = handler;
        break;
      case 'delete':
        this.onDelete = handler;
        break;
      case 'execute':
        this.onExecute = handler;
        break;
      default:
        console.error(`TestController.set called with unknown action: '${action}'`);
        return;
    }
  }
}
