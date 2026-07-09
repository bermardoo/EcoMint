use aiken/collection/list
use cardano/address
use cardano/assets.{lovelace_of}
use cardano/transaction.{OutputReference, Transaction}

pub type MarketplaceDatum {
  seller_pkh: ByteArray,
  project_type: Int,
  carbon_amount: Int,
  price_per_unit_lovelace: Int,
}

validator ecomint {
  spend(
    datum: Option<MarketplaceDatum>,
    _redeemer: Data,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    // extrai os dados da prateleira
    expect Some(d) = datum
    // calculo do preço final
    let required_payment = d.carbon_amount * d.price_per_unit_lovelace

    // varre todas as saídas da transação do comprador
    let is_seller_paid =
      list.any(
        self.outputs,
        fn(output) {
          // verificar se o dinheiro está indo para a chave do vendedor
          if output.address.payment_credential == address.VerificationKey(
            d.seller_pkh,
          ) {
            let lovelace_amount = lovelace_of(output.value)
            // true se o valor pago for maior ou igual ao exigido
            lovelace_amount >= required_payment
          } else {
            // caso outra carteira, ignora e continua procurando
            False
          }
        },
      )

    // contrato só destranca e finaliza a compra se acima for verdade
    is_seller_paid
  }

  else(_) {
    fail
  }
}
