const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

// global constants
const url = 'http://localhost:8080/services';
const OK = 200;
const NO_CONTENT = 204;
const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;

// --- config ---
const logEnabled = true; // set true to print test data

// --- global test variables ---
let endpoints = [];
let resources = [];
let mapping = {};

console.log(`
  NOTE: this is an integration test consisting of multiple consecutive tests.
  The "-b" flag is set, so test execution stops after the first failing test.
`);

// --- test cases ---
describe('GET /rd/endpoints', () => {
  it('should return a non-empty JSON array', async () => {
    const res = await chai.request(url).get('/rd/endpoints');
    expect(res.status).to.equal(OK);
    expect(res).to.be.json;
    endpoints = res.body;
    expect(endpoints).to.be.an('array');
    expect(endpoints.length).to.be.greaterThan(0);
    log('returns:');
    log(endpoints);
  });
});

describe('The returned endpoints array', () => {
  it('should consist of endpoints containing resources', () => {
    expect()
    resources = extractResources(endpoints);
    expect(resources).to.be.an('array');
    expect(resources.length).to.be.greaterThan(0);
    log('resources extracted from endpoints:');
    log(resources);
  });
});

describe('The extracted resources', () => {
  it('should contain "base", "if", "path" and "rt" properties', () => {
    resources.forEach((resource, index) => {
      expect(resource.base).to.be.a('string');
      expect(resource.base.length).to.be.greaterThan(0);
      expect(resource.path).to.be.a('string');
      expect(resource.path.length).to.be.greaterThan(0);
      expect(resource.rt).to.be.a('string');
      expect(resource.rt.length).to.be.greaterThan(0);
      mapping[`/${resource.if}s/${resource.rt}/${index}`] = (
        resource.base + resource.path
      );
    })
    log('Mapping generated from resources:')
    log(mapping);
  });
});

describe('PUT /mapping', () => {
  it('should return status 204 (NO CONTENT)', async () => {
    const res = await chai.request(url).put('/mapping').send(mapping);
    expect(res.status).to.equal(NO_CONTENT);
  });
});

describe('GET /mapping', () => {
  it('should return the same mapping', async () => {
    const res = await chai.request(url).get('/mapping');
    expect(res.status).to.equal(OK);
    expect(res).to.be.json;
    expect(res.body).to.be.an('object');
    expect(res.body).to.deep.equal(mapping);
  });
});

describe('GET, PUT and DELETE /gateway/...', () => {
  it('should forward requests to resources based on the mapping', async () => {
    Object.keys(mapping).forEach(async path => {
      log('1st GET' + path + ' request: ' + new Date().getTime());
      const res1 = await chai.request(url).get('/gateway' + path);
      log('1st GET' + path + ' response: ' + new Date().getTime());
      expect(res1.status).to.equal(OK);
      expect(res1).to.be.json;
      expect(res1.body).to.be.an('object');
      expect(res1.body.status).to.equal(OK);
      expect(res1.body.payload).to.be.an('object');

      if (path.startsWith('/actuators')) {
        log('1st PUT' + path + ' request: ' + new Date().getTime());
        const res2 = await chai.request(url).put('/gateway' + path).send({
          value: 1
        });
        log('1st PUT' + path + ' response: ' + new Date().getTime());
        expect(res2.status).to.equal(OK);
        expect(res2.body.status).to.equal(OK);

        log('2nd GET' + path + ' request: ' + new Date().getTime());
        const res3 = await chai.request(url).get('/gateway' + path);
        log('2nd GET' + path + ' response: ' + new Date().getTime());
        expect(res3.status).to.equal(OK);
        expect(res3).to.be.json;
        expect(res3.body).to.be.an('object');
        expect(res3.body.status).to.equal(OK);
        expect(res3.body.payload.value).to.equal(1);

        log('2nd PUT' + path + ' request: ' + new Date().getTime());
        const res4 = await chai.request(url).put('/gateway' + path).send({
          value: 0
        });
        log('2nd PUT' + path + ' response: ' + new Date().getTime());
        expect(res4.status).to.equal(OK);
        expect(res4.body.status).to.equal(OK);

        log('3rd GET' + path + ' request: ' + new Date().getTime());
        const res5 = await chai.request(url).get('/gateway' + path);
        log('3rd GET' + path + ' response: ' + new Date().getTime());
        expect(res5.status).to.equal(OK);
        expect(res5).to.be.json;
        expect(res5.body).to.be.an('object');
        expect(res5.body.status).to.equal(OK);
        expect(res5.body.payload.value).to.equal(0);
      }
      log('1st DELETE' + path + ' request: ' + new Date().getTime());
      const res = await chai.request(url).delete('/gateway' + path);
      log('1st DELETE' + path + ' response: ' + new Date().getTime());
      expect(res.status).to.equal(METHOD_NOT_ALLOWED);
    })
  });
});

describe('GET and PUT /gateway', () => {
  it('should forward requests to resources based on the mapping', async () => {
    Object.keys(mapping).forEach(async path => {
      const res1 = await chai.request(url).get('/gateway/foo/bar');
      expect(res1.body.status).to.equal(NOT_FOUND);

      const res2 = await chai.request(url).put('/gateway/foo/bar').send({
        value: 1
      });
      expect(res2.body.status).to.equal(NOT_FOUND);

      const res3 = await chai.request(url).delete('/gateway/foo/bar');
      expect(res3.status).to.equal(METHOD_NOT_ALLOWED);
    })
  });
});

// --- test helper functions ---
const log = data => {
  if (logEnabled) {
    console.log(data);
  }
}
// extracts resources from endpoints (copied from fog-ui's ApiBuilder)
const extractResources = endpoints => {
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
