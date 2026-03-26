import * as jwt from "jsonwebtoken"
import { AuthType } from "../../../src/node/cli"
import { authenticated } from "../../../src/node/http"

describe("authenticated (gateway)", () => {
  const secret = "test-secret-for-gateway-auth"
  const makeReq = (cookies: Record<string, string>, headers?: Record<string, string | string[]>) => {
    return {
      args: {
        auth: AuthType.Gateway,
        "jwt-secret": secret,
      },
      cookies,
      headers: headers || {},
      cookieSessionName: "test_cookie",
    } as any
  }

  it("returns true for valid Bearer token", async () => {
    const token = jwt.sign({ sub: "user1", email: "a@b.c" }, secret, { expiresIn: "1h" })
    const req = makeReq({}, { authorization: `Bearer ${token}` })
    await expect(authenticated(req)).resolves.toBe(true)
  })

  it("returns true for valid cookie token", async () => {
    const token = jwt.sign({ sub: "user1" }, secret, { expiresIn: "1h" })
    const req = makeReq({ test_cookie: token })
    await expect(authenticated(req)).resolves.toBe(true)
  })

  it("returns false for invalid token", async () => {
    const req = makeReq({ test_cookie: "not.a.jwt" })
    await expect(authenticated(req)).resolves.toBe(false)
  })

  it("returns false when secret missing", async () => {
    const token = jwt.sign({ sub: "user1" }, secret, { expiresIn: "1h" })
    const req = makeReq({ test_cookie: token })
    req.args["jwt-secret"] = ""
    await expect(authenticated(req)).resolves.toBe(false)
  })
})
