defmodule AstrupWeb.RedirectController do
  use AstrupWeb, :controller

  def redirect_to_printouts(conn, _params) do
    conn
    |> Phoenix.Controller.redirect(to: ~p"/admin/printouts")
    |> Plug.Conn.halt()
  end
end
