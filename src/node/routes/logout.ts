import { Router } from "express"
import { AuthType } from "../cli"
import { getCookieOptions, getJwtCookieOptions, redirect } from "../http"
import { sanitizeString } from "../util"

export const router = Router()

router.get<{}, undefined, undefined, { base?: string; to?: string }>("/", async (req, res) => {
  // Must use the *identical* properties used to set the cookie.
  const cookieOpts = req.args.auth === AuthType.Gateway ? getJwtCookieOptions(req) : getCookieOptions(req)
  res.clearCookie(req.cookieSessionName, cookieOpts)

  const to = sanitizeString(req.query.to) || "/"
  return redirect(req, res, to, { to: undefined, base: undefined, href: undefined })
})
