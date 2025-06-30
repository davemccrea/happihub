defmodule AstrupWeb.ChangeLocale do
  use AstrupWeb, :controller
  require Logger

  def index(conn, %{"locale" => locale}) do
    Logger.info("Setting locale to #{locale}")

    referrer = get_req_header(conn, "referer") |> List.first() || "/"

    redirect_path =
      if referrer && String.contains?(referrer, conn.host) do
        URI.parse(referrer).path || "/"
      else
        "/"
      end

    conn
    |> put_session(:locale, locale)
    |> redirect(to: redirect_path)
  end
end
