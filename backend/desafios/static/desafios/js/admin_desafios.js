(function($) {
    $(document).ready(function() {
        var CAMPOS_POR_TIPO = {
            'acertos_por_banca_hoje': ['banca'],
            'acertos_por_materia_hoje': ['materia'],
            'usar_item_hoje': ['item'],
            'comprar_item_hoje': ['item'],  // aqui é opcional, mas ajuda mostrar o campo
            'partida_em_horario_hoje': ['horario_inicio', 'horario_fim'],
        };
        var TODOS_CAMPOS = ['banca', 'materia', 'item', 'horario_inicio', 'horario_fim'];

        function atualizarCampos() {
            var tipoSelecionado = $('#id_tipo_condicao').val();
            var camposParaMostrar = CAMPOS_POR_TIPO[tipoSelecionado] || [];

            TODOS_CAMPOS.forEach(function(campo) {
                var linha = $('.form-row.field-' + campo);
                if (camposParaMostrar.indexOf(campo) !== -1) {
                    linha.show();
                } else {
                    linha.hide();
                }
            });
        }

        $('#id_tipo_condicao').on('change', atualizarCampos);
        atualizarCampos();
    });
})(django.jQuery);