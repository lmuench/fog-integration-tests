const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

const url = 'http://localhost:8080/services';

console.log(`
  NOTE: this is an integration test consisting of multiple consecutive tests.
  The "-b" flag is set, so test execution stops after the first failing test.
`);

// --- config ---
const log = false; // set true to print test data

// --- global test variables ---
let endpoints = [];
let resources = [];

// --- test cases ---
describe('GET /rd/endpoints', () => {
  it('should return a non-empty JSON array', async () => {
    const res = await chai.request(url).get('/rd/endpoints');
    expect(res.status).to.equal(200);
    expect(res).to.be.json;
    endpoints = res.body;
    expect(endpoints).to.be.an('array');
    expect(endpoints.length).to.be.greaterThan(0);
    if (log) console.log('returns:');
    if (log) console.log(endpoints);
  });
});

describe('The returned endpoints array', () => {
  it('should consist of endpoints containing resources', async () => {
    expect()
    resources = extractResources(endpoints);
    expect(resources).to.be.an('array');
    expect(resources.length).to.be.greaterThan(0);
    if (log) console.log('resources extracted from endpoints:');
    if (log) console.log(resources);
  });
});

describe('GET /mapping', () => {
  it('should return a JSON object', async () => {
    const res = await chai.request(url).get('/mapping');
    expect(res.status).to.equal(200);
    expect(res).to.be.json;
    expect(res.body).to.be.an('object');
  });
});

// --- test helper functions ---
// extracts resources from endpoints (copied from fog-ui's ApiBuilder)
extractResources = endpoints => {
  const resources = [];
  let index = 0;
  endpoints.forEach(endpoint => {
    endpoint.resources.forEach(resource => {
      const extendedResource = {
        ...endpoint,
        ...resource
      };
      delete extendedResource.resources;
      extendedResource.customPath = extendedResource.path;
      extendedResource.index = index;
      extendedResource.status = 'new';
      index += 1;
      resources.push(extendedResource);
    })
  })
  return resources;
}
