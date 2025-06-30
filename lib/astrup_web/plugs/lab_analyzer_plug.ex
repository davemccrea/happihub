defmodule AstrupWeb.Plugs.LabAnalyzerPlug do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    conn =
      case get_session(conn, "current_lab") do
        nil ->
          put_session(conn, "current_lab", "Astrup.Lab.Fimlab")

        _ ->
          conn
      end

    case get_session(conn, "current_analyzer") do
      nil ->
        put_session(conn, "current_analyzer", "Astrup.Analyzer.RadiometerAbl90FlexPlus")

      _ ->
        conn
    end
  end
end
