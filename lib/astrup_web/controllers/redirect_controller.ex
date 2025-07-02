defmodule AstrupWeb.RedirectController do
  use AstrupWeb, :controller

  def redirect_to_patient_cases(conn, _params) do
    conn
    |> Phoenix.Controller.redirect(to: ~p"/admin/patient-cases")
    |> Plug.Conn.halt()
  end
end
