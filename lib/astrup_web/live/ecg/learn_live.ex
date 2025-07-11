defmodule AstrupWeb.Ecg.LearnLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="max-w-4xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-base-content mb-8">
          {gettext("Learn ECG")}
        </h1>

        <div class="bg-base-200 rounded-lg p-8 text-center">
          <div class="mb-4">
            <.icon name="hero-heart" class="h-16 w-16 mx-auto text-primary" />
          </div>
          <h2 class="text-xl font-semibold text-base-content mb-4">
            {gettext("ECG Learning Module")}
          </h2>
          <p class="text-base-content/70 mb-6">
            {gettext("Learn about ECG interpretation, analysis, and clinical applications.")}
          </p>
          <p class="text-sm text-base-content/60 italic">
            {gettext("Coming soon...")}
          </p>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
