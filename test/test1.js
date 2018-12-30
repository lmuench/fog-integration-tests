const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

// --- config ---
const logEnabled = true;  // set true to print test data

// --- global constants ---
const url = 'http://localhost:8080/services';  // gateway backend REST services
// HTTP status codes:
const OK = 200;
const NO_CONTENT = 204;
const NOT_FOUND = 404;
const METHOD_NOT_ALLOWED = 405;
const NOT_IMPLEMENTED = 501;
const BAD_GATEWAY = 502;

// --- global test variables ---
let resources = [];
let mapping = {};

console.log(`
  NOTE: this is an integration test consisting of multiple consecutive tests.
  The "-b" flag is set, so test execution stops after the first failing test.
`);

// --- test cases ---
describe('GET /rd/resources', () => {
  it('should return a non-empty JSON array', async () => {
    const res = await chai.request(url).get('/rd/resources');
    expect(res.status).to.equal(OK);
    expect(res).to.be.json;
    resources = res.body;
    expect(resources).to.be.an('array');
    expect(resources.length).to.be.greaterThan(0);
    log('returns:');
    log(resources);
  });
});

describe('The resources', () => {
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
      mapping[`/${resource.if}s/${resource.rt}/${index}:if`] = (
        resource.if
      );
      mapping[`/${resource.if}s/${resource.rt}/${index}:rt`] = (
        resource.rt
      );
    })
    log('Mapping generated from resources:')
    log(mapping);
  });
});

describe('PUT /mappings', () => {
  it('should return status 204 "NO CONTENT"', async () => {
    const res = await chai.request(url).put('/mappings').send(mapping);
    expect(res.status).to.equal(NO_CONTENT);
  });
});

describe('GET /mappings', () => {
  it('should return the same mapping', async () => {
    const res = await chai.request(url).get('/mappings');
    expect(res.status).to.equal(OK);
    expect(res).to.be.json;
    expect(res.body).to.be.an('object');
    expect(res.body).to.deep.equal(mapping);
  });
});

describe('GET, PUT and DELETE on all resources (/gateway/...)', () => {
  it('should forward requests to resources based on the mapping', async () => {
    for (const path in mapping) {
      if (!path.includes(':')) {
        log('1st GET' + path + ' request: ' + new Date().getTime());
        const res1 = await chai.request(url).get('/gateway' + path);
        log('1st GET' + path + ' response: ' + new Date().getTime());
        expect(res1.status).to.equal(OK);
        expect(res1).to.be.json;
        expect(res1.body).to.be.an('object');
        expect(res1.body).to.be.an('object');
  
        if (path.startsWith('/actuators')) {
          log('1st PUT' + path + ' request: ' + new Date().getTime());
          const res2 = await chai.request(url).put('/gateway' + path).send({
            value: 1
          });
          log('1st PUT' + path + ' response: ' + new Date().getTime());
          expect(res2.status).to.equal(OK);
  
          log('2nd GET' + path + ' request: ' + new Date().getTime());
          const res3 = await chai.request(url).get('/gateway' + path);
          log('2nd GET' + path + ' response: ' + new Date().getTime());
          expect(res3.status).to.equal(OK);
          expect(res3).to.be.json;
          expect(res3.body).to.be.an('object');
          expect(res3.body.value).to.equal(1);
  
          log('2nd PUT' + path + ' request: ' + new Date().getTime());
          const res4 = await chai.request(url).put('/gateway' + path).send({
            value: 0
          });
          log('2nd PUT' + path + ' response: ' + new Date().getTime());
          expect(res4.status).to.equal(OK);
  
          log('3rd GET' + path + ' request: ' + new Date().getTime());
          const res5 = await chai.request(url).get('/gateway' + path);
          log('3rd GET' + path + ' response: ' + new Date().getTime());
          expect(res5.status).to.equal(OK);
          expect(res5).to.be.json;
          expect(res5.body).to.be.an('object');
          expect(res5.body.value).to.equal(0);
        }
        log('1st DELETE' + path + ' request: ' + new Date().getTime());
        const res = await chai.request(url).delete('/gateway' + path);
        log('1st DELETE' + path + ' response: ' + new Date().getTime());
        expect(res.status).to.equal(METHOD_NOT_ALLOWED);
      }
    }
  });
});

describe('Fetching all resources after PUT /mappings with empty object', () => {
  after(async () => {
    log('Cleaning up...');
    await chai.request(url).put('/mappings').send({});
  });

  it('should return "NOT FOUND" or "METHOD NOT ALLOWED"', async () => {
    log('PUT /mappings with empty object body: ' + new Date().getTime());
    const res = await chai.request(url).put('/mappings').send({});
    expect(res.status).to.equal(NO_CONTENT);
    for (const path in mapping) {
      const res1 = await chai.request(url).get('/gateway' + path);
      expect(res1.status).to.equal(NOT_FOUND);

      const res2 = await chai.request(url).put('/gateway' + path).send({
        value: 1
      });
      expect(res2.status).to.equal(NOT_FOUND);

      const res3 = await chai.request(url).delete('/gateway' + path);
      expect(res3.status).to.equal(METHOD_NOT_ALLOWED);
    }
  });

  describe('Fetching all resources with incorrect port', () => {
    it('should return "BAD GATEWAY or "METHOD NOT ALLOWED""', async () => {
      log('Increasing port numbers:');
      const wrongPortMapping = { ...mapping };
      for (const key in wrongPortMapping) {
        if (!key.includes(':')) {
          log(wrongPortMapping[key]);
          const splitUrl = wrongPortMapping[key].split(':');
          log(splitUrl);
          let port = parseInt(splitUrl[2].slice(0, 4));
          port += 30;
          wrongPortMapping[key] = (
            splitUrl[0] + ':' + splitUrl[1] + ':' + port + splitUrl[2].slice(4)
          );
          log('-> ' + wrongPortMapping[key]);
        }
      }
      log(wrongPortMapping);

      log('PUT /mappings with wrong port mapping ' + new Date().getTime());
      const res = await chai.request(url).put('/mappings').send(
        wrongPortMapping
      );
      expect(res.status).to.equal(NO_CONTENT);
      for (const path in mapping) {
        if (!path.includes(':')) {
          const res1 = await chai.request(url).get('/gateway' + path);
          expect(res1.status).to.equal(BAD_GATEWAY);
          
          const res2 = await chai.request(url).put('/gateway' + path).send({
           value: 1
          });
          expect(res2.status).to.equal(BAD_GATEWAY);
          
          const res3 = await chai.request(url).delete('/gateway' + path);
          expect(res3.status).to.equal(METHOD_NOT_ALLOWED); 
        }
      }
    });
  });

  describe('Fetching resources of unsupported protocol', () => {
    it('should return "NOT IMPLEMENTED" or "METHOD NOT ALLOWED"', async () => {
      log('Changing scheme to unsupported protocol:');
      const wrongProtocolMapping = { ...mapping };
      for (const key in wrongProtocolMapping) {
        if (!key.includes(':')) {
          log(wrongProtocolMapping[key]);
          const splitUrl = wrongProtocolMapping[key].split(':');
          wrongProtocolMapping[key] = 'foo:' + splitUrl[1] + splitUrl[2];
          log('-> ' + wrongProtocolMapping[key]);
        }
      }
      log(wrongProtocolMapping);

      log('PUT /mappings with wrong protocol mapping ' + new Date().getTime());
      const res = await chai.request(url).put('/mappings').send(
        wrongProtocolMapping
      );
      expect(res.status).to.equal(NO_CONTENT);
      for (const path in mapping) {
        if (!path.includes(':')) {        
          const res1 = await chai.request(url).get('/gateway' + path);
          expect(res1.status).to.equal(NOT_IMPLEMENTED);
  
          const res2 = await chai.request(url).put('/gateway' + path).send({
            value: 1
          });
          expect(res2.status).to.equal(NOT_IMPLEMENTED);
  
          const res3 = await chai.request(url).delete('/gateway' + path);
          expect(res3.status).to.equal(METHOD_NOT_ALLOWED);
        }
      }
    });
  });
});

// --- test helper functions ---
const log = data => {
  if (logEnabled) {
    console.log(data);
  }
}
