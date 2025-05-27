defmodule AstrupWeb.Plugs.LocalePlug do
  import Plug.Conn

  require Logger

  def init(opts), do: opts

  def call(conn, _opts) do
    case get_session(conn, "locale") do
      nil ->
        Gettext.put_locale(AstrupWeb.Gettext, "en")
        put_session(conn, "locale", "en")

      locale ->
        Gettext.put_locale(AstrupWeb.Gettext, locale)
        conn
    end
  end
end
