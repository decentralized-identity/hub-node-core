import BaseController from '../../lib/controllers/BaseController';
import HubRequest from '../../lib/models/HubRequest';
import HubResponse from '../../lib/models/HubResponse';
import Context from '../../lib/Context';

export default class TestController extends BaseController {
  private onAdd?: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void;
  private onRead?: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void;
  private onRemove?: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void;
  private onUpdate?: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void;
  private onExecute?: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void;

  constructor() {
    super(Context);
  }

  async handleAddRequest(request: HubRequest): Promise<HubResponse> {
    return new Promise<HubResponse>((resolve, reject) => {
      if (!this.onAdd) {
        reject('Add not defined in TestController.');
      } else {
        this.onAdd(request, resolve, reject);
      }
    });
  }

  async handleReadRequest(request: HubRequest): Promise<HubResponse> {
    return new Promise<HubResponse>((resolve, reject) => {
      if (!this.onRead) {
        reject('Read not defined in TestController.');
      } else {
        this.onRead(request, resolve, reject);
      }
    });
  }

  async handleRemoveRequest(request: HubRequest): Promise<HubResponse> {
    return new Promise<HubResponse>((resolve, reject) => {
      if (!this.onRemove) {
        reject('Remove not defined in TestController.');
      } else {
        this.onRemove(request, resolve, reject);
      }
    });
  }

  async handleUpdateRequest(request: HubRequest): Promise<HubResponse> {
    return new Promise<HubResponse>((resolve, reject) => {
      if (!this.onUpdate) {
        reject('Update not defined in TestController.');
      } else {
        this.onUpdate(request, resolve, reject);
      }
    });
  }

  async handleExecuteRequest(request: HubRequest): Promise<HubResponse> {
    return new Promise<HubResponse>((resolve, reject) => {
      if (!this.onExecute) {
        reject('Execute not defined in TestController.');
      } else {
        this.onExecute(request, resolve, reject);
      }
    });
  }

  reset() {
    this.onAdd = undefined;
    this.onRead = undefined;
    this.onRemove = undefined;
    this.onUpdate = undefined;
    this.onExecute = undefined;
  }

  setAdd(onAddDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    this.onAdd = onAddDo;
  }

  setRead(onReadDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    this.onRead = onReadDo;
  }

  setRemove(onRemoveDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    this.onRemove = onRemoveDo;
  }

  setUpdate(onUpdateDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    this.onUpdate = onUpdateDo;
  }

  setExecute(onExecuteDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    this.onExecute = onExecuteDo;
  }

  set(action: string, onActionDo: (request: HubRequest, resolve: (result: HubResponse) => void, reject: (reason: any) => void) => void) {
    switch (action.toLowerCase().trim()) {
      case 'add':
        this.setAdd(onActionDo);
        break;
      case 'read':
        this.setRead(onActionDo);
        break;
      case 'update':
        this.setUpdate(onActionDo);
        break;
      case 'remove':
        this.setRemove(onActionDo);
        break;
      case 'execute':
        this.setExecute(onActionDo);
        break;
      default:
        console.error(`TestController.set called with unknown action: '${action}'`);
        return;
    }
  }
}
