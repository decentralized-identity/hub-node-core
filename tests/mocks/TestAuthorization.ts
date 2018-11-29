import AuthorizationController from "../../lib/controllers/AuthorizationController";
import HubRequest from "../../lib/models/HubRequest";
import TestStore from "./TestStore";

export default class TestAuthorization extends AuthorizationController {

  constructor() {
    super(new TestStore());
  }

  private value: boolean | undefined;

  async authorize(_: HubRequest): Promise<Boolean> {
    if (!this.value) {
      throw new Error('TestAuthorization must have authorize set.');
    }
    return this.value;
  }

  setAuthorize(toReturn: boolean) {
    this.value = toReturn;
  }
}