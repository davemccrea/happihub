defmodule AstrupWeb.ECGLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">ECG Test</h1>
        <div id="ecg-playback" phx-hook="ECGPlayback">
          <div data-ecg-chart></div>
          <button data-ecg-play class="btn btn-primary mt-4">Play</button>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
