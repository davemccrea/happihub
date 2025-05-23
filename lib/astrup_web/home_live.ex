defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_, _, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <.result />
    """
  end
end
