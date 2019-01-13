import base64url from 'base64url';
import CommitDeserializer from '../../lib/utilities/CommitDeserializer';

const validCreateCommitFields = {
  protected: {
    interface: 'Collections',
    context: 'http://schema.org',
    type: 'MusicPlaylist',
    operation: 'create',
    committed_at: (new Date()).toISOString(),
    commit_strategy: 'basic',
    sub: 'did:example:owner.id',
    kid: 'did:example:owner.id#key-abc',
    iss: 'did:example:writer.id',
  },
  payload: {
    hello: 'world',
  },
  signature: 'abc123',
};

const buildCommit = (params: {protected: object, payload: object, signature: string}) => {
  return {
    payload: base64url.encode(JSON.stringify(params.payload)),
    protected: base64url.encode(JSON.stringify(params.protected)),
    signature: params.signature,
  };
};

const validCreateCommit = buildCommit(validCreateCommitFields);

describe('CommitDeserializer', () => {

  it('should deserialize a real commit', async () => {
    const commit = await CommitDeserializer.deserialize(validCreateCommit);
    expect(commit.getHeaders().type).toEqual(validCreateCommitFields.protected.type);
  });

  it('should require an object type for now', async () => {
    try {
      const commit = await CommitDeserializer.deserialize('string');
      fail(commit);
    } catch (e) {
      expect(e.message).toContain('must be of type object');
    }
  });

  it('should throw if a required field is missing', async () => {
    try {
      const serialized = buildCommit(validCreateCommitFields);
      delete serialized.payload;
      const commit = await CommitDeserializer.deserialize(serialized);
      fail(commit);
    } catch (e) {
      expect(e.message).toContain('missing required field: payload');
    }
  });

  it('should throw if an extraneous field is present', async () => {
    try {
      const serialized = buildCommit(validCreateCommitFields);
      (serialized as any).extra = 'a string';
      const commit = await CommitDeserializer.deserialize(serialized);
      fail(commit);
    } catch (e) {
      expect(e.message).toContain('has extraneous field: extra');
    }
  });

});
