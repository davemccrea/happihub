defmodule AstrupWeb.Plugs.LabAnalyzerPlug do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    case conn.assigns[:current_scope] do
      %{user: user} when not is_nil(user) ->
        conn
        |> put_session("current_lab", user.laboratory)
        |> put_session("current_analyzer", user.analyzer)

      _ ->
        conn
        |> put_session("current_lab", "Astrup.Lab.Fimlab")
        |> put_session("current_analyzer", "Astrup.Analyzer.RadiometerAbl90FlexPlus")
    end
  end
end
