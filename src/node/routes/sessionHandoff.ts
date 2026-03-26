import { logger } from "@coder/logger"
import { Router } from "express"
import { AuthType } from "../cli"
import { getJwtCookieOptions, redirect, self } from "../http"
import { HttpCode, HttpError } from "../../common/http"

/**
 * D4a Option B: browser hits docen with a one-time handoff code; docen redeems server-side with express-gateway
 * and sets the gateway session cookie, then redirects to the workbench.
 */
export const router = Router()

router.get("/session/handoff", async (req, res, next) => {
  if (req.args.auth !== AuthType.Gateway) {
    return next(new HttpError("Handoff requires gateway auth mode", HttpCode.NotFound))
  }

  const code = typeof req.query.code === "string" ? req.query.code.trim() : ""
  if (!code) {
    const to = self(req)
    return redirect(req, res, "login", { to: to !== "/" ? to : undefined })
  }

  const gatewayUrl = (req.args["gateway-url"] || "").replace(/\/$/, "")
  if (!gatewayUrl) {
    logger.error("session/handoff: gateway-url is not configured")
    return next(new HttpError("Gateway not configured", HttpCode.ServerError))
  }

  try {
    const redeemUrl = `${gatewayUrl}/auth/handoff/redeem`
    const resp = await fetch(redeemUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })

    if (!resp.ok) {
      const to = self(req)
      logger.warn(`session/handoff: redeem failed (HTTP ${resp.status})`)
      return redirect(req, res, "login", { to: to !== "/" ? to : undefined })
    }

    const data = (await resp.json()) as { token?: string }
    if (!data.token || typeof data.token !== "string") {
      return next(new HttpError("Invalid redeem response", HttpCode.ServerError))
    }

    res.cookie(req.cookieSessionName, data.token, getJwtCookieOptions(req))

    const toParam = typeof req.query.to === "string" ? req.query.to : undefined
    const dest = toParam && toParam.length > 0 ? toParam : "/"
    return redirect(req, res, dest, { to: undefined })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`session/handoff error: ${message}`)
    return next(err instanceof Error ? err : new Error(String(err)))
  }
})
