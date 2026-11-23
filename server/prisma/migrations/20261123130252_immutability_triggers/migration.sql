-- Restricción estricta de stock
ALTER TABLE "Stock" ADD CONSTRAINT "stock_nonneg" CHECK (quantity >= 0);

-- Función para abortar mutaciones no deseadas
CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Violación de Inmutabilidad: Operación % en la tabla % bloqueada por políticas de auditoría (ARQ-03).', TG_OP, TG_TABLE_NAME;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Bloqueo total de UPDATE y DELETE en el historial de Movimientos
CREATE TRIGGER prevent_movement_mutation
BEFORE UPDATE OR DELETE ON "Movement"
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Bloqueo de DELETE en entidades transaccionales y maestras
CREATE TRIGGER prevent_product_delete 
BEFORE DELETE ON "Product" 
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER prevent_sale_delete 
BEFORE DELETE ON "Sale" 
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER prevent_saledetail_delete 
BEFORE DELETE ON "SaleDetail" 
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER prevent_user_delete 
BEFORE DELETE ON "User" 
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();