defmodule AstrupWeb.ChangeLocale do
  use AstrupWeb, :controller
  require Logger

  def index(conn, %{"locale" => locale}) do
    Logger.info("Setting locale to #{locale}")

    conn
    |> put_session(:locale, locale)
    |> redirect(to: "/")
  end
end
