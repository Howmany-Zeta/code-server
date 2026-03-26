import { Router, Request } from "express"
import { promises as fs } from "fs"
import * as jwt from "jsonwebtoken"
import * as path from "path"
import { rootPath } from "../constants"
import { authenticated, getJwtCookieOptions, redirect, replaceTemplates } from "../http"
import i18n from "../i18n"
import { sanitizeString } from "../util"
import { RateLimiter } from "./login"

const getRoot = async (req: Request, error?: Error): Promise<string> => {
  const content = await fs.readFile(path.join(rootPath, "src/browser/pages/login-gateway.html"), "utf8")
  const locale = req.args["locale"] || "en"
  i18n.changeLanguage(locale)
  const welcomeText = req.args["welcome-text"] || (i18n.t("WELCOME", { app: req.args["app-name"] }) as string)
  const gatewayUrl = (req.args["gateway-url"] || "http://localhost:3001").replace(/\/$/, "")
  const to = (typeof req.query.to === "string" && req.query.to) || "/"

  return replaceTemplates(
    req,
    content.replace(/{{I18N_LOGIN_TITLE}}/g, i18n.t("LOGIN_TITLE", { app: req.args["app-name"] }) as string),
    {
      gatewayUrl,
      appName: req.args["app-name"],
      welcomeText,
      to,
      loginError: error?.message,
    },
  )
}

const limiter = new RateLimiter()

export const router = Router()

router.use(async (req, res, next) => {
  const to = (typeof req.query.to === "string" && req.query.to) || "/"
  if (await authenticated(req)) {
    // Same behavior as password login: preserve query (incl. `to`) when redirecting.
    return redirect(req, res, to, { to: undefined })
  }
  next()
})

router.get("/", async (req, res) => {
  res.send(await getRoot(req))
})

router.post<{}, string, { token?: string; base?: string; href?: string } | undefined, { to?: string }>(
  "/",
  async (req, res) => {
    const token = sanitizeString(req.body?.token)
    const secret = req.args["jwt-secret"] || ""

    try {
      if (!limiter.canTry()) {
        throw new Error(i18n.t("LOGIN_RATE_LIMIT") as string)
      }
      if (!token) {
        throw new Error(i18n.t("GATEWAY_TOKEN_MISSING") as string)
      }
      if (!secret) {
        throw new Error(i18n.t("GATEWAY_SECRET_MISSING") as string)
      }

      try {
        jwt.verify(token, secret)
      } catch {
        limiter.removeToken()
        throw new Error(i18n.t("GATEWAY_TOKEN_INVALID") as string)
      }

      res.cookie(req.cookieSessionName, token, getJwtCookieOptions(req))

      const to = (typeof req.query.to === "string" && req.query.to) || "/"
      redirect(req, res, to, { to: undefined })
    } catch (error: any) {
      const renderedHtml = await getRoot(req, error)
      res.send(renderedHtml)
    }
  },
)
