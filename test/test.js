const chai = require('chai');
const chaiHttp = require('chai-http');

chai.use(chaiHttp);
const expect = chai.expect;

const url = 'http://localhost:8080/services';

describe('mapping', () => {
  it('should return an array', () => {
    chai
    .request(url)
    .get('/mapping')
    .then(res => {
      expect(res.status).to.equal(200);
      expect(res).to.be.json;
      expect(res.body).to.be.an('object');
    });
  });
});
