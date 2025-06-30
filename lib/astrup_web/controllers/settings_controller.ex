defmodule AstrupWeb.SettingsController do
  use AstrupWeb, :controller

  def update(conn, %{"lab" => lab, "analyzer" => analyzer} = params) do
    return_to = params["return_to"] || "/settings"

    conn
    |> put_session("current_lab", lab)
    |> put_session("current_analyzer", analyzer)
    |> put_flash(:info, gettext("Settings updated successfully"))
    |> redirect(to: return_to)
  end
end
