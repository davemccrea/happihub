defmodule AstrupWeb.AbgInterpretationLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale}>
      <h1>Blood Gas Interpretation</h1>
    </Layouts.app>
    """
  end
end
