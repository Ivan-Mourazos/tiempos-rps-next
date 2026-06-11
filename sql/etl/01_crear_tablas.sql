/* =============================================================
   ETL Monitorización — 01: Crear tablas destino + índices
   Para revisión de IT (David). NO ejecuta cargas, solo DDL.

   Origen: vista TGM_MONITORIZACION (13 joins + subqueries, ~60k filas, 4 años)
   Destino: tabla plana indexada. Lecturas web pasan de 2-10s a <100ms.

   Notas:
   - foto1-4 NO se incluyen (legacy, confirmado por IT). Las fotos van
     en TGM_MONITORIZACION_FOTOS_FLAT (origen: vista TGM_MONITORIZACION_FOTOS).
   - cliente ya viene RESUELTO (incluye fallback a MANMaintenanceWarning
     cuando m.cliente es NULL) -> la web elimina el OUTER APPLY.
   - Se añaden las columnas que la web hoy saca con JOINs extra:
     DireccionCliente, TelefonoPreavisoCliente, LocalidadCliente, ZipCode, Provincia.
   ============================================================= */

IF OBJECT_ID('dbo.TGM_MONITORIZACION_FLAT', 'U') IS NOT NULL
BEGIN
    PRINT 'TGM_MONITORIZACION_FLAT ya existe. Borra manualmente si quieres recrear.';
    RETURN;
END
GO

CREATE TABLE dbo.TGM_MONITORIZACION_FLAT (
    asistencia        varchar(25)   NOT NULL,  -- MaintenanceOrderCode, única en la vista (verificado)
    aviso             varchar(25)   NULL,
    tipo              varchar(10)   NULL,
    fecha             datetime      NULL,
    hora              int           NULL,
    comercial         varchar(250)  NULL,
    abreviatura       varchar(5)    NULL,
    codperso          varchar(10)   NULL,
    cliente           varchar(250)  NULL,      -- resuelto (vista + fallback warning)
    [local]           varchar(250)  NULL,
    localidad         varchar(250)  NULL,
    Telefono1         varchar(250)  NULL,
    Telefono2         varchar(250)  NULL,
    tiempo_total      int           NULL,
    tiempo_previsto   int           NULL,
    prioridad         int           NULL,
    texto             varchar(max)  NULL,
    observaciones     varchar(max)  NULL,
    solucion          varchar(250)  NULL,
    gps               varchar(250)  NULL,
    pedido            varchar(8000) NULL,
    -- Columnas que la web hoy saca con JOINs a TGM_ORDENES_MANTENIMIENTO_DIA / FACCustomer / GENState
    DireccionCliente        varchar(500) NULL,
    TelefonoPreavisoCliente varchar(250) NULL,
    LocalidadCliente        varchar(250) NULL,
    ZipCode                 varchar(20)  NULL,
    Provincia               varchar(250) NULL,
    -- Control ETL
    etl_updated_at    datetime NOT NULL CONSTRAINT DF_FLAT_etl DEFAULT (GETDATE()),

    CONSTRAINT PK_TGM_MONITORIZACION_FLAT PRIMARY KEY CLUSTERED (asistencia)
);
GO

-- Índice principal de la web: filtro por fechas + orden fecha/hora
CREATE NONCLUSTERED INDEX IX_FLAT_fecha
    ON dbo.TGM_MONITORIZACION_FLAT (fecha, hora)
    INCLUDE (tipo, prioridad, abreviatura, comercial);
GO

-- Filtros por técnico / tipo / prioridad combinados con fecha
CREATE NONCLUSTERED INDEX IX_FLAT_tipo_fecha
    ON dbo.TGM_MONITORIZACION_FLAT (tipo, fecha);
CREATE NONCLUSTERED INDEX IX_FLAT_abrev_fecha
    ON dbo.TGM_MONITORIZACION_FLAT (abreviatura, fecha);
GO

-- Búsquedas por cliente / aviso / teléfono (LIKE '%x%' sigue siendo scan,
-- pero sobre 60k filas planas = milisegundos; no necesita más)

/* ---------- Fotos ---------- */
IF OBJECT_ID('dbo.TGM_MONITORIZACION_FOTOS_FLAT', 'U') IS NOT NULL
BEGIN
    PRINT 'TGM_MONITORIZACION_FOTOS_FLAT ya existe.';
    RETURN;
END
GO

CREATE TABLE dbo.TGM_MONITORIZACION_FOTOS_FLAT (
    asistencia varchar(25)   NOT NULL,
    foto       varchar(8000) NOT NULL,
    etl_updated_at datetime NOT NULL CONSTRAINT DF_FOTOS_FLAT_etl DEFAULT (GETDATE())
);
GO

CREATE CLUSTERED INDEX IX_FOTOS_FLAT_asistencia
    ON dbo.TGM_MONITORIZACION_FOTOS_FLAT (asistencia);
GO

PRINT 'Tablas FLAT creadas correctamente.';
