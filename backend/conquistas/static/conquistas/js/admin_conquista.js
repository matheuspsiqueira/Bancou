// conquistas/static/conquistas/js/admin_conquista.js
//
// Mostra/esconde os campos "banca" e "materia" no form de Conquista do
// admin, conforme o tipo_condicao escolhido. Só um dos dois (ou nenhum)
// fica visível por vez.
//
// Mapa replicado de CAMPOS_EXTRAS_POR_TIPO em conquistas/services.py —
// se adicionar um tipo novo que precise de campo extra lá, adiciona a
// mesma entrada aqui também.
(function () {
    var CAMPOS_EXTRAS = {
        'acertos_por_banca': 'banca',
        'acertos_por_materia': 'materia',
    };
    var TODOS_CAMPOS_EXTRAS = ['banca', 'materia'];

    function atualizarCampos() {
        var select = document.getElementById('id_tipo_condicao');
        if (!select) return;

        var campoAtivo = CAMPOS_EXTRAS[select.value];

        TODOS_CAMPOS_EXTRAS.forEach(function (campo) {
            var linha = document.querySelector('.field-' + campo);
            if (!linha) return;
            linha.style.display = (campo === campoAtivo) ? '' : 'none';
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var select = document.getElementById('id_tipo_condicao');
        if (!select) return;
        select.addEventListener('change', atualizarCampos);
        atualizarCampos(); // estado inicial (ex.: reabrindo uma conquista pra editar)
    });
})();