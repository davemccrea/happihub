defmodule AstrupWeb.Layouts do
  @moduledoc """
  This module holds different layouts used by your application.

  See the `layouts` directory for all templates available.
  The "root" layout is a skeleton rendered as part of the
  application router. The "app" layout is set as the default
  layout on both `use AstrupWeb, :controller` and
  `use AstrupWeb, :live_view`.
  """
  use AstrupWeb, :html

  embed_templates "layouts/*"
end
