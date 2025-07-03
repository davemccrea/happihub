defmodule AstrupWeb.HomeLive do
  use AstrupWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} locale={@locale} current_scope={@current_scope}>
      <div class="min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div class="w-full max-w-4xl">
          
    <!-- Reference Values Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-semibold text-base-content mb-6">
              {gettext("Reference Values")}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <.link
                navigate={~p"/reference-values/learn"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-book-open" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">{gettext("Learn")}</h3>
              </.link>

              <.link
                navigate={~p"/reference-values/quiz"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-academic-cap" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">{gettext("Quiz")}</h3>
              </.link>
            </div>
          </div>
          
    <!-- Interpretation Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-semibold text-base-content mb-6">
              {gettext("Interpretation")}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <.link
                navigate={~p"/interpretation/learn"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-book-open" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">{gettext("Learn")}</h3>
              </.link>

              <.link
                navigate={~p"/interpretation/quiz"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-academic-cap" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">{gettext("Quiz")}</h3>
              </.link>

              <.link
                navigate={~p"/interpretation/interpreter"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-calculator" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">{gettext("Interpreter")}</h3>
              </.link>
            </div>
          </div>
          
    <!-- Settings Section -->
          <div class="mb-12">
            <h2 class="text-2xl font-semibold text-base-content mb-6">
              {gettext("Settings")}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <.link
                navigate={~p"/users/settings"}
                class="group relative rounded-box p-8 text-center bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105"
              >
                <div class="mb-4">
                  <.icon name="hero-cog-6-tooth" class="h-12 w-12 mx-auto text-primary" />
                </div>
                <h3 class="text-xl font-semibold text-base-content mb-2">Settings</h3>
              </.link>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end
end
