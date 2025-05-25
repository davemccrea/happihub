defmodule AstrupWeb.PageController do
  use AstrupWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
