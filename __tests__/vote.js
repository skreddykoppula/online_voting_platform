
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

const { response } = require("../app");

let server, agent;

function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}


const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Voting application test suite", function () {
  beforeAll(async () => {
    server = app.listen(5000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Signup new user", async () => {
    res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "sk",
      lastName: "reddy",
      email: "skreddy@gmail.com",
      password: "skreddy",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("User login", async () => {
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
    await login(agent, "skreddy@gmail.com", "skreddy");
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
  });

  test("User signout", async () => {
    let res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/electionpage");
    expect(res.statusCode).toBe(302);
  });

  test("Creating election", async () => {
    const agent = request.agent(server);
    await login(agent, "skreddy@gmail.com", "skreddy");
    const res = await agent.get("/electionpage/addelection");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/electionpage").send({
      electionName: "election",
      publicurl: "election",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });
});
